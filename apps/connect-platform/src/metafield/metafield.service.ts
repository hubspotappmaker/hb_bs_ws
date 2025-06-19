import { App } from '@app/common';
import { CommonModuleName } from '@app/common/interface/enum/module.enum';
import { Connect } from '@app/common/schemas/connect.schema';
import { ModuleApp } from '@app/common/schemas/module.schema';
import { Field } from '@app/common/schemas/field.schema';
import {
    mapCommonToHubspotModule,
    mapCommonToShopifyModule,
} from '@app/common/util/module.util';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HubspotMetafieldService } from 'apps/hubspot/src/metafield/hubspot.metafield.service';
import { ShopifyMetafieldService } from 'apps/shopify/src/metafield/shopify.metafield.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Types } from 'mongoose';
import { AssociateFieldDto } from '@app/common/interface/dto/common/metafield.dto';
import { CreateCustomFieldDto } from '@app/common/interface/dto/hubspot/create.customfield.dto';
import { HubspotApplicationService } from '../application/hubspot-application.service';
import { HubspotCredentialService } from 'apps/hubspot/src/hubspot.credential.service';
import { PropertyConfig } from '@app/common/interface/type/request.type';

@Injectable()
export class MetafieldService {
    constructor(
        @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
        @InjectModel(ModuleApp.name) private moduleAppModel: SoftDeleteModel<ModuleApp>,
        @InjectModel(Field.name) private fieldModel: SoftDeleteModel<Field>,
        private readonly hubspotMetafieldService: HubspotMetafieldService,
        private readonly shopifyMetafieldService: ShopifyMetafieldService,
        private readonly hubspotApplicationService: HubspotApplicationService,
        private readonly hubspotCredentialService: HubspotCredentialService
    ) { }

    async changemetaFieldStatus(connect_id: string, user_id: string) {
        const pointConnect = await this.connectModel.findOne({ _id: connect_id, user: user_id });
        if (!pointConnect)
        {
            throw new NotFoundException(`Not found connect with this id: ${connect_id}`);
        }

        pointConnect.syncMetafield = !pointConnect.syncMetafield;
        return pointConnect.save();
    }


    private async syncFieldsInModule(
        appId: Types.ObjectId,
        commonModule: CommonModuleName,
        externalFields: { name: string; label: string; description?: string }[],
        user_id: string,
        connect_id: string
    ): Promise<Field[]> {
        const moduleDoc = await this.moduleAppModel.findOne({ app: appId, type: commonModule });
        if (!moduleDoc)
        {
            throw new NotFoundException(`Module ${commonModule} not found for app ${appId}`);
        }

        // Fetch current fields from database
        const currentFieldIds = moduleDoc.fields as Types.ObjectId[];
        const localFields = await this.fieldModel.find({
            _id: { $in: currentFieldIds },
            connect: connect_id,
            user: user_id
        });
        const localByName = new Map<string, Field>();
        localFields.forEach(f => localByName.set(f.name, f));
        console.log('Local fields before sync:', localFields.map(f => f.name));

        // Log external
        console.log('External fields:', externalFields.map(f => f.name));
        const externalNames = new Set(externalFields.map(f => f.name));

        // Remove deleted fields
        const updatedFieldIds: Types.ObjectId[] = [];
        for (const f of localFields)
        {
            if (!externalNames.has(f.name))
            {
                console.log(`Deleting field: ${f.name}`);
                await this.fieldModel.findByIdAndDelete(f._id);
            } else
            {
                updatedFieldIds.push(f._id);
            }
        }

        // Add new fields
        for (const ext of externalFields)
        {
            if (!localByName.has(ext.name))
            {
                console.log(`Creating new field: ${ext.name}`);
                const newField = await this.fieldModel.create({
                    name: ext.name,
                    label: ext.label,
                    description: ext.description,
                    connect: connect_id,
                    user: user_id,
                    moduletype: commonModule
                });
                updatedFieldIds.push(newField._id);
            }
        }

        // Save module with updated references
        moduleDoc.fields = updatedFieldIds;
        await moduleDoc.save();
        console.log('check moduleDoc:', moduleDoc);

        // Return fresh Field docs
        return this.fieldModel.find({ _id: { $in: updatedFieldIds } });
    }


    async getMetaFieldFrom(
        connectId: string,
        module: CommonModuleName,
        userId: string,
    ): Promise<Field[]> {
        const shopifyModule = mapCommonToShopifyModule(module);

        const pointConnect = await this.connectModel.findOne({ _id: connectId, user: userId });
        if (!pointConnect)
        {
            throw new NotFoundException(`Not found connect with this id: ${connectId}`);
        }

        const pointShopify = await this.appModel.findById(pointConnect.from);
        if (!pointShopify)
        {
            throw new NotFoundException(`Shopify app not found: ${pointConnect.from}`);
        }

        const externalFields = await this.shopifyMetafieldService.getAllCustomField(
            pointShopify.id,
            shopifyModule,
        );

        return this.syncFieldsInModule(pointShopify._id, module, externalFields, userId, connectId);
    }


    async getMetaFieldTo(
        connectId: string,
        module: CommonModuleName,
        userId: string,
    ): Promise<Field[]> {
        const hubspotModule = mapCommonToHubspotModule(module);

        const pointConnect = await this.connectModel.findOne({ _id: connectId, user: userId })
            .populate('to');

        //@ts-ignore
        const prefix = pointConnect?.to.credentials.prefix
        if (!pointConnect)
        {
            throw new NotFoundException(`Not found connect with this id: ${connectId}`);
        }

        const pointHubspot = await this.appModel.findById(pointConnect.to);
        if (!pointHubspot)
        {
            throw new NotFoundException(`HubSpot app not found: ${pointConnect.to}`);
        }

        const externalFields = await this.hubspotMetafieldService.getAllCustomField(
            pointHubspot.id,
            hubspotModule,
            prefix
        );

        return this.syncFieldsInModule(pointHubspot._id, module, externalFields, userId, connectId);
    }

    async associateField(dto: AssociateFieldDto, user_id: string) {
        const { from, to, connect } = dto;

        const fromField = await this.fieldModel.findOne({
            _id: from,
            connect: connect,
            user: user_id
        })

        const toField = await this.fieldModel.findOne({
            _id: to,
            connect: connect,
            user: user_id
        })

        if (!toField)
        {
            throw new NotFoundException("Can not found field with id: " + to)
        }

        if (!fromField)
        {
            throw new NotFoundException("Can not found field with id: " + from)
        }

        if (toField.isUsed)
        {
            throw new ConflictException(`Field ${toField.label} already use in a field!`)
        }

        if (fromField.mappingField)
        {
            const mappedFiel = await this.fieldModel.findOne({
                _id: fromField.mappingField
            });
            if (!mappedFiel)
            {
                throw new NotFoundException("Cannot found mapped field")
            }
            mappedFiel.isUsed = false;
            mappedFiel.mappingField = null;
            await mappedFiel.save()
        }

        fromField.isUsed = true;
        fromField.mappingField = toField.id
        fromField.save()

        toField.isUsed = true;
        toField.mappingField = fromField.id
        toField.save()

        return {
            fromField,
            toField,
        }

    }

    async releaseAssociate(from_id: string, user_id: string) {

        const fromField = await this.fieldModel.findOne({
            _id: from_id,
            user: user_id
        })



        if (!fromField)
        {
            throw new NotFoundException("Can not found field with id: " + from_id)
        }



        if (fromField.mappingField)
        {
            const toField = await this.fieldModel.findOne({
                _id: fromField.mappingField,
                user: user_id
            });

            if (toField)
            {
                toField.isUsed = false;
                toField.mappingField = null;
                await toField.save()
            }

        }

        fromField.isUsed = false
        fromField.mappingField = null;

        await fromField.save();

        return {
            fromField
        }

    }

    async createNewCustomField(createCustomFieldDto: CreateCustomFieldDto, user_id: string) {
        const { connect_id, module, name } = createCustomFieldDto

        const hubspotModule = mapCommonToHubspotModule(module)

        const existConnect = await this.connectModel.findOne({
            user: user_id,
            _id: connect_id
        })
            .populate('from')
            .populate('to')
        //@ts-ignore
        const prefixName = existConnect?.to.credentials.prefix;

        console.log("check prefixName: ", prefixName)

        const pointConnect = await this.connectModel.findOne({ _id: connect_id, user: user_id });
        if (!pointConnect)
        {
            throw new NotFoundException(`Not found connect with this id: ${connect_id}`);
        }

        const pointHubspot = await this.appModel.findById(pointConnect.to);
        if (!pointHubspot)
        {
            throw new NotFoundException(`HubSpot app not found: ${pointConnect.to}`);
        }

        const token = await this.hubspotCredentialService.getToken(pointHubspot.id)

        const processedName = name.toLowerCase().replace(/\s+/g, '_') + `_${prefixName}custom`;
        console.log("check hubspotModule: ", hubspotModule)
        const newField: PropertyConfig = {
            //@ts-ignore
            objectType: `${hubspotModule.toLocaleLowerCase()}s`,
            name: processedName,
            label: `${prefixName ? prefixName.toLocaleLowerCase() + '-' : ""}${name}`,
            type: 'string',
            fieldType: 'text',
            groupName: `${hubspotModule}information`,
        }

        const response = await this.hubspotApplicationService.createCustomProperty(token, newField)

        if (response.status > 201)
        {
            throw new BadRequestException(response.msg);
        }

        return response.msg
    }
}
