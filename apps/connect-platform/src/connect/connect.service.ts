import { App } from '@app/common';
import { CreateConnectDto, UpdateConnectDto } from '@app/common/interface/dto/common/connect.dto';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { PaginationResponse } from '@app/common/interface/response/pagination.response';
import { Connect } from '@app/common/schemas/connect.schema';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ConnectWebhookService } from './connect-webhook.service';
import { PlatformName } from '@app/common/interface/enum/platform.enum';
import { ShopifyApplicationService } from '../application/shopify-application.service';
import { HubspotApplicationService } from '../application/hubspot-application.service';
import {Types} from "mongoose";

@Injectable()
export class ConnectService {
    constructor(
        @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
        private readonly connectWebhookService: ConnectWebhookService,
        private readonly shopifyApplicationService: ShopifyApplicationService,
        private readonly hubspotApplicationService: HubspotApplicationService
    ) { }

    async getAllApplication(paginationDto: PaginationDto, user_id: string): Promise<PaginationResponse> {
        console.log("check paginationDto: ", JSON.stringify(paginationDto));
        const { page, limit } = paginationDto;

        const filter:any = {
            user: new Types.ObjectId(user_id).toString(),
            isDeleted: false,
        };
        console.log(filter)

        const totalRecord = await this.connectModel.countDocuments(filter);
        const totalPage = Math.ceil(totalRecord / limit);

        const data = await this.connectModel
            .find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'from',
                select: '-credentials'
            })
            .populate({
                path: 'to',
                select: '-credentials'
            })
            .exec();


        return {
            data,
            page,
            size: limit,
            totalPage,
            totalRecord,
        };
    }

    async getDetailConnect(connect_id: string, user_id: string) {
        console.log('connect id: ', connect_id)
        const filter = {
            user: user_id,
            _id: connect_id,
        };

        return await this.connectModel.findOne(filter)
    }

    async createNewConnect(dto: CreateConnectDto, user_id: string) {

        const appFrom = await this.appModel.findOne({
            _id: dto.from
        }).exec()

        const appTo = await this.appModel.findOne({
            _id: dto.to
        }).exec()

        console.log('check from: ', appFrom)
        console.log('check to: ', appTo)

        if (appFrom?.platform.toString() === appTo?.platform.toString())
        {
            throw new ConflictException('Cannot connect two apps on the same platform!');
        }



        if (!appFrom)
        {
            throw new NotFoundException("Not found app with id: ", dto.from);
        }

        if (!appTo)
        {
            throw new NotFoundException("Not found app with id: ", dto.to);
        }

        const oldToken = appTo.credentials;

        const tokenNew = {
            ...oldToken,
            hub_id: appFrom.credentials.hub_id,
        };


        await this.appModel.updateOne(
            { _id: dto.to },
            {
                $set: {
                    'credentials': tokenNew,
                },
            },
        );

        if (dto.from === dto.to)
        {
            throw new ConflictException("Cannot connect to itself.")
        }

        const exisConnect = this.connectModel.find({
            from: dto.from,
            to: dto.to,
            user: user_id,
        }).exec();

        const exisConnect2 = this.connectModel.find({
            from: dto.to,
            to: dto.from,
            user: user_id,
        }).exec();

        if ((await exisConnect).length > 0)
        {
            throw new ConflictException('Connect is exist!')
        }

        if ((await exisConnect2).length > 0)
        {
            throw new ConflictException('Connect is exist!')
        }

        const newConnect = new this.connectModel({
            from: dto.from,
            to: dto.to,
            name: dto.connectName,
            isActive: false,
            user: user_id
        })

        if (appFrom)
        {
            appFrom.isActive = true;
            await appFrom.save();
        }

        if (appTo)
        {
            appTo.isActive = true;
            await appTo.save();
        }

        return await newConnect.save();



    }

    async softDelete(connect_id: string, user_id) {

        const filter = {
            _id: connect_id,
            user: user_id
        }

        const exitsConnect = await this.connectModel.findOne(filter);

        if (!exitsConnect)
        {
            throw new NotFoundException("Can not delete not exist connect");
        }

        if (exitsConnect.isActive)
        {
            throw new BadRequestException('Please disable webhook first!')
        }

        if (exitsConnect.isSyncing)
        {
            throw new BadRequestException('Cannot delete while syncing is in progress!')
        }

        await this.connectModel.softDelete(filter);

        const appFrom = await this.appModel.findOne({
            _id: exitsConnect.from
        });

        const appTo = await this.appModel.findOne({
            _id: exitsConnect.to
        });


        if (!appFrom)
        {
            throw new NotFoundException("Not found app with id: ", exitsConnect.from.toString());
        }

        if (!appTo)
        {
            throw new NotFoundException("Not found app with id: ", exitsConnect.to.toString());
        }

        const isFrom = await this.connectModel.find({
            user: user_id,
            from: appFrom.id,
            isDeleted: false
        })

        const isTo = await this.connectModel.find({
            user: user_id,
            to: appTo.id,
            isDeleted: false
        })


        if (isFrom.length === 0)
        {
            if (appFrom)
            {
                appFrom.isActive = false;
                await appFrom.save();
            }
        }

        if (isTo.length === 0)
        {
            if (appTo)
            {
                appTo.isActive = false;
                await appTo.save();
            }
        }

    }

    async disableConnect(connect_id: string, user_id: string) {
        const filter = { _id: connect_id, user: user_id };
        const exitsConnect = await this.connectModel.findOne(filter)
            .populate({
                path: 'from',
                populate: { path: 'platform' }
            })
            .populate({
                path: 'to',
                populate: { path: 'platform' }
            })
            .exec();

        if (!exitsConnect)
        {
            throw new NotFoundException('Connect not found');
        }

        //@ts-ignore
        const platform = exitsConnect.from.platform.name;
        //@ts-ignore
        const platTo = exitsConnect.to.platform.name

        const fromAppId = exitsConnect.from._id.toString();
        if (platform === PlatformName.SHOPIFY && platTo === PlatformName.HUBSPOT)
        {
            await this.connectWebhookService.destructionWebhookShopify(fromAppId);
        }


        exitsConnect.isActive = false;
        await exitsConnect.save();

        return exitsConnect;
    }

    async enableConnect(connect_id: string, user_id: string) {
        const filter = { _id: connect_id, user: user_id };
        const exitsConnect = await this.connectModel.findOne(filter)
            .populate({
                path: 'from',
                populate: { path: 'platform' }
            })
            .populate({
                path: 'to',
                populate: { path: 'platform' }
            })
            .exec();

        if (!exitsConnect)
        {
            throw new NotFoundException('Connect not found');
        }

        //@ts-ignore
        const platform = exitsConnect.from.platform.name;
        //@ts-ignore
        const platTo = exitsConnect.to.platform.name

        const fromAppId = exitsConnect.from._id.toString();
        const toAppId = exitsConnect.to._id.toString();


        //@ts-ignore
        const shopifyUrl: string = exitsConnect.from.credentials.shopUrl;

        //@ts-ignore
        const shopifyToken: string = exitsConnect.from.credentials.accessToken;

        //@ts-ignore
        const hubspotAppID: string = exitsConnect.to.id;


        if (platform === PlatformName.SHOPIFY && platTo === PlatformName.HUBSPOT)
        {
            //check token shopify
            await this.shopifyApplicationService.validateShopifyPermissions(shopifyUrl, shopifyToken)
            //check token hubspot
            await this.hubspotApplicationService.validateHubspotToken(hubspotAppID);
            //create webhook
            await this.connectWebhookService.createWebhookShopify(fromAppId, toAppId, connect_id);
        }


        exitsConnect.isActive = true;
        await exitsConnect.save();

        return exitsConnect;
    }

    async updateConnectName(user_id: string, dto: UpdateConnectDto) {
        const { id, name } = dto;
        const filter = {
            _id: id,
            user: user_id
        }

        const exitsConnect = await this.connectModel.findOne(filter);

        if (!exitsConnect)
        {
            throw new NotFoundException("Can not found not exist connect");
        }

        exitsConnect.name = name;

        await exitsConnect.save()
    }


}
