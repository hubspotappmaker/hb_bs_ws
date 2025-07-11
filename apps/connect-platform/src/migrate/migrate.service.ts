import { StartMigrateHubspotDto } from '@app/common/interface/dto/common/migrate.dto';
import { ModuleSync, PlatformName } from '@app/common/interface/enum/platform.enum';
import { Connect } from '@app/common/schemas/connect.schema';
import { HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HubspotMigrateService } from 'apps/hubspot/src/shopify/hubspot.migrate.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ShopifyApplicationService } from '../application/shopify-application.service';
import { HubspotApplicationService } from '../application/hubspot-application.service';

@Injectable()
export class MigrateService {
    constructor(
        @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
        private readonly hubspotMigrateService: HubspotMigrateService,
        private readonly shopifyApplicationService: ShopifyApplicationService,
        private readonly hubspotApplicationService: HubspotApplicationService
    ) { }
    async startSyncData(dto: StartMigrateHubspotDto, connectId: string, user_id: string) {

        const filter = { _id: connectId, user: user_id };
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
        const shopifyUrl: string = exitsConnect.from.credentials.shopUrl;

        //@ts-ignore
        const shopifyToken: string = exitsConnect.from.credentials.accessToken;

        //@ts-ignore
        const hubspotAppID: string = exitsConnect.to.id;

        await this.shopifyApplicationService.validateShopifyPermissions(shopifyUrl, shopifyToken);
        await this.hubspotApplicationService.validateHubspotToken(hubspotAppID);

        switch (dto.moduleSync)
        {
            case ModuleSync.PRODUCT:
                exitsConnect.migratedProducts = 0;
                break;

            case ModuleSync.CUSTOMER:
                exitsConnect.migratedContacts = 0;
                break;

            case ModuleSync.ORDER:
                exitsConnect.migratedOrders = 0;
                break;

            case ModuleSync.ALL:
                exitsConnect.migratedOrders = 0;
                exitsConnect.migratedContacts = 0;
                exitsConnect.migratedProducts = 0;
                break;

        }
        exitsConnect.isSyncing = true;
        await exitsConnect.save();

        //@ts-ignore
        const platform = exitsConnect.from.platform.name;
        //@ts-ignore
        const platTo = exitsConnect.to.platform.name

        //@ts-ignore
        const shopifyId: any = exitsConnect.from.id;
        //@ts-ignore
        const hubspotId: any = exitsConnect.to.id

        if (platform === PlatformName.SHOPIFY && platTo === PlatformName.HUBSPOT)
        {
            await this.hubspotMigrateService.startMigrate(dto, shopifyId, hubspotId, connectId, user_id)
        }

        exitsConnect.isSyncing = false;
        exitsConnect.save()

        return true
    }
}
