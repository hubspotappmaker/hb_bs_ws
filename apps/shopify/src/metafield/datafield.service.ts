import { Field } from "@app/common";
import { ShopifyTranferTohubspot } from "@app/common/interface/shopify/shopify.metafield";
import { Connect } from "@app/common/schemas/connect.schema";
import { App } from "@app/common/schemas/app.schema";
import { ModuleApp } from "@app/common/schemas/module.schema";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { firstValueFrom } from "rxjs";
import { mapCommonToHubspotModule, mapCommonToShopifyModule } from "@app/common/util/module.util";

@Injectable()
export class DatafieldService {
    private readonly logger = new Logger(DatafieldService.name);

    constructor(
        private readonly httpService: HttpService,
        @InjectModel(Field.name) private readonly fieldModel: SoftDeleteModel<Field>,
        @InjectModel(Connect.name) private readonly connectModel: SoftDeleteModel<Connect>,
        @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
        @InjectModel(ModuleApp.name) private readonly moduleModel: SoftDeleteModel<ModuleApp>,
    ) { }

    async tranferShopifyMetaFieldToHubspot(credential: ShopifyTranferTohubspot): Promise<void> {
        const { connect_id, module, from: shopifyProductId, to: hubspotProductId } = credential;
        if (!connect_id) return

        // 1. Lấy kết nối, app và module từ DB
        const connection = await this.connectModel.findById(connect_id).exec();
        if (!connection) return this.logger.warn(`No connection for ID ${connect_id}`);
        if (!connection.syncMetafield) return;
        const [shopifyApp, hubspotApp] = await Promise.all([
            this.appModel.findById(connection.from).exec(),
            this.appModel.findById(connection.to).exec(),
        ]);
        if (!shopifyApp || !hubspotApp)
        {
            return this.logger.warn('Shopify or HubSpot App not found');
        }
        const [shopifyModule, hubspotModule] = await Promise.all([
            this.moduleModel.findOne({ app: shopifyApp._id, type: module }).populate('fields').exec(),
            this.moduleModel.findOne({ app: hubspotApp._id, type: module }).populate('fields').exec(),
        ]);
        if (!shopifyModule || !hubspotModule)
        {
            return this.logger.warn(`Module ${module} missing in one of apps`);
        }

        // 2. Tạo mappedList từ module.fields
        const mappedList = (shopifyModule.fields as unknown as Field[])
            .filter(sf => sf.mappingField)
            .map(sf => {
                const hf = (hubspotModule.fields as unknown as Field[])
                    .find(hf => hf._id.toString() === sf.mappingField!.toString());
                return {
                    shopifyKey: sf.name,
                    hubspotProp: hf?.name!,
                };
            });
        this.logger.debug('Mapped Fields:', mappedList);

        const { shopUrl, accessToken } = shopifyApp.credentials;
        const { access_token: hubspotToken } = hubspotApp.credentials;
        const sModule = `${mapCommonToShopifyModule(module)}s`;
        const hModule = `${mapCommonToHubspotModule(module)}s`;

        try
        {
            // 3. GET metafields từ Shopify
            const url = `${shopUrl}/admin/api/2025-04/${sModule}/${shopifyProductId}/metafields.json`;
            const shopifyRes = await firstValueFrom(
                this.httpService.get<{ metafields: any[] }>(url, {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                }),
            );
            const metafields = shopifyRes.data.metafields;

            // 4. Lọc và build properties payload
            const properties: Record<string, any> = {};
            mappedList.forEach(({ shopifyKey, hubspotProp }) => {
                const mf = metafields.find(m => m.key === shopifyKey);
                if (!mf || mf.value == null) return;

                // Nếu cần parse JSON (vd dimension), thử parse
                let value = mf.value;
                try
                {
                    const parsed = JSON.parse(mf.value);
                    // nếu là object bạn có thể chọn parsed.value hoặc giữ nguyên object
                    if (parsed && parsed.value != null)
                    {
                        value = parsed.value;
                    }
                } catch
                {
                    // không phải JSON, giữ nguyên string
                }
                properties[hubspotProp] = value;
            });

            if (Object.keys(properties).length === 0)
            {
                return this.logger.log('No metafield to update on HubSpot');
            }

            // 5. PATCH lên HubSpot
            const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/${hModule}/${hubspotProductId}`;
            const hubspotRes = await firstValueFrom(
                this.httpService.patch(
                    hubspotUrl,
                    { properties },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${hubspotToken}`,
                        },
                    },
                ),
            );
            this.logger.log(`HubSpot update success: ${hubspotRes.data.id}`);
        } catch (err)
        {
            this.logger.error('Error in transfer process', err);
        }
    }
}
