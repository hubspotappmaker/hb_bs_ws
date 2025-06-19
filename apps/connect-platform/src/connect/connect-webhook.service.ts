import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { InjectModel } from "@nestjs/mongoose";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { lastValueFrom } from "rxjs";
import { App } from "@app/common";

@Injectable()
export class ConnectWebhookService {
    constructor(
        private readonly httpService: HttpService,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
    ) { }

    /**
     *
     * @param fromApp  ID of the App document to pull shopUrl & token from
     * @param toApp    ID to include in each webhook callback URL
     */
    async createWebhookShopify(fromApp: string, toApp: string, connect_id: string) {
        const shopify = await this.appModel.findById(fromApp);
        if (!shopify)
        {
            throw new HttpException(
                `Shopify integration ${fromApp} not found`,
                HttpStatus.NOT_FOUND,
            );
        }

        const { shopUrl, accessToken } = shopify.credentials;
        const apiVersion = '2025-04';
        const endpoint = `${shopUrl}/admin/api/${apiVersion}/webhooks.json`;

        const definitions = [
            { topic: 'orders/updated', segment: 'order' },
            { topic: 'products/update', segment: 'product' },
            { topic: 'customers/update', segment: 'customer' },
            { topic: 'products/create', segment: 'product' },
            { topic: 'customers/create', segment: 'customer' },
        ];

        const newWebhookIds: string[] = [];

        for (const def of definitions)
        {
            const address = `https://sync.onextdigital.com/shopify-app/webhook/${def.segment}/${fromApp}/${toApp}/${connect_id}`;
            console.log("check url webhook: ", address)
            const payload = {
                webhook: {
                    topic: def.topic,
                    address,
                    format: 'json',
                },
            };

            try
            {
                const resp = await lastValueFrom(
                    this.httpService.post(
                        endpoint,
                        payload,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Shopify-Access-Token': accessToken,
                            },
                        },
                    )
                );

                const webhookId = resp.data.webhook.id;
                newWebhookIds.push(String(webhookId));

            } catch (err)
            {
                console.error(
                    `Error creating "${def.topic}" webhook:`,
                    err.response?.data || err.message
                );
            }
        }

        shopify.webhookIds = Array.isArray(shopify.webhookIds)
            ? shopify.webhookIds.concat(newWebhookIds)
            : newWebhookIds;

        await shopify.save();

    }

    async destructionWebhookShopify(fromApp: string) {
        const shopify = await this.appModel.findById(fromApp);
        if (!shopify)
        {
            throw new HttpException(
                `Shopify integration ${fromApp} not found`,
                HttpStatus.NOT_FOUND,
            );
        }

        const { shopUrl, accessToken, webhookIds } = shopify.credentials
            ? { shopUrl: shopify.credentials.shopUrl, accessToken: shopify.credentials.accessToken, webhookIds: shopify.webhookIds }
            : { shopUrl: null, accessToken: null, webhookIds: [] };

        if (!shopUrl || !accessToken)
        {
            throw new HttpException(
                `Missing Shopify credentials on App ${fromApp}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const apiVersion = '2025-04';

        for (const id of webhookIds || [])
        {
            const url = `${shopUrl}/admin/api/${apiVersion}/webhooks/${id}.json`;
            try
            {
                const resp = await lastValueFrom(
                    this.httpService.delete(
                        url,
                        {
                            headers: {
                                'X-Shopify-Access-Token': accessToken,
                            },
                        },
                    )
                );
            } catch (err)
            {
                console.error(`Error deleting webhook ${id}:`, err.response?.data || err.message);
            }
        }

        shopify.webhookIds = [];
        await shopify.save();

    }

    async createWebhookHubspot(fromApp: string, toApp: string) {

    }

    async destructionWebhookHubspot(fromApp: string) {

    }


}
