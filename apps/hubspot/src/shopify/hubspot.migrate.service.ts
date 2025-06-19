import { App } from "@app/common";
import { CommonProduct } from "@app/common/interface/data/product.type";
import { StartMigrateHubspotDto } from "@app/common/interface/dto/common/migrate.dto";
import { ModuleSync } from "@app/common/interface/enum/platform.enum";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { lastValueFrom } from 'rxjs';
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { HubspotSyncService } from "./hubspot.sync.service";
import { CommonAddress, CommonCustomer } from "@app/common/interface/data/customer.type";
import { CommonOrder, TaxUnit } from "@app/common/interface/data/order.type";
import { CustomLogger } from "@app/common/log/extend.log";

@Injectable()
export class HubspotMigrateService {
    private readonly logger = new CustomLogger(HubspotMigrateService.name);
    private readonly BATCH_SIZE: number = Number(process.env.BATCH_SIZE_COMMON) || 5;

    constructor(
        private readonly httpService: HttpService,
        private readonly hubspotSyncService: HubspotSyncService,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
    ) { }

    async startMigrate(data: StartMigrateHubspotDto, shopifyId: string, hubspotId: string, connectId: string, user_id: string) {
        this.logger.log(`Start migrating module: ${data.moduleSync} for shopifyId: ${shopifyId}`);

        switch (data.moduleSync)
        {
            case ModuleSync.CUSTOMER:
                await this.migrateShopifyContacts(data, shopifyId, hubspotId, connectId, user_id);
                break;

            case ModuleSync.ORDER:
                await this.migrateShopifyOrders(data, shopifyId, hubspotId, connectId, user_id);
                break;

            case ModuleSync.PRODUCT:
                await this.migrateShopifyProducts(data, shopifyId, hubspotId, connectId, user_id);
                break;

            case ModuleSync.ALL:
                await this.migrateShopifyContacts(data, shopifyId, hubspotId, connectId, user_id);
                await this.migrateShopifyProducts(data, shopifyId, hubspotId, connectId, user_id);
                await this.migrateShopifyOrders(data, shopifyId, hubspotId, connectId, user_id);
                break;

            default:
                this.logger.warn(`Unknown moduleSync: ${data.moduleSync}`);
                break;
        }
    }


    private buildGraphqlArgs(first: number, after: string | null, queryFilter: string) {
        const args: string[] = [];
        args.push(`first: ${first}`);
        if (after)
        {
            args.push(`after: "${after}"`);
        }
        if (queryFilter)
        {
            args.push(`query: "${queryFilter}"`);
        }
        return args.join(', ');
    }

    private async fetchPage(query: string, shopDomain: string, accessToken: string) {
        const response$ = this.httpService.post(
            `${shopDomain}/admin/api/2025-01/graphql.json`,
            { query },
            { headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken } },
        );
        const response: any = await lastValueFrom(response$);

        if (!response || response.status !== 200)
        {
            this.logger.error(`Unexpected HTTP status: ${response?.status}`);
            throw new Error(`HTTP error: ${response?.status}`);
        }
        if (response.data.errors && response.data.errors.length)
        {
            this.logger.error('GraphQL errors', response.data.errors);
            throw new Error('GraphQL query returned errors');
        }

        return response.data.data;
    }

    //sycn contact

    async migrateShopifyContacts(data: StartMigrateHubspotDto, shopifyId: string, hubspotId: string, connectId: string, user_id: string) {
        const start = Date.now();
        const shopify = await this.appModel.findOne({ _id: shopifyId }).exec();
        const shop: any = shopify?.credentials;
        const shopDomain = shop.shopUrl;
        const accessToken = shop.accessToken;

        let hasNextPage = true;
        let after: string | null = null;
        const first = 250;
        const queryFilter = data.sync_from && data.sync_to
            ? `created_at:>${data.sync_from} created_at:<${data.sync_to}`
            : '';

        if (queryFilter) this.logger.debug(`Shopify query filter (customers): ${queryFilter}`);

        while (hasNextPage)
        {
            const args = this.buildGraphqlArgs(first, after, queryFilter);
            // Updated GraphQL query to include all addresses
            const graphqlQuery = `
            query {
                customers(${args}) {
                    pageInfo { hasNextPage endCursor }
                    edges {
                        node {
                            id
                            firstName
                            lastName
                            email
                            phone
                            defaultAddress { address1 address2 city province countryCodeV2 zip phone company }
                            addresses { address1 address2 city province countryCodeV2 zip phone company }
                        }
                    }
                }
            }
            `;

            const dataNode = (await this.fetchPage(graphqlQuery, shopDomain, accessToken)).customers;
            hasNextPage = dataNode.pageInfo.hasNextPage;
            after = dataNode.pageInfo.endCursor;
            const contacts = dataNode.edges.map((e: any) => e.node);
            this.logger.debug(`Fetched contacts page: hasNextPage=${hasNextPage}, endCursor=${after}`);

            const commonCustomers = this.mapToCommonCustomers(contacts);

            for (let i = 0; i < commonCustomers.length; i += this.BATCH_SIZE)
            {
                const batch = commonCustomers.slice(i, i + this.BATCH_SIZE);
                const batchStart = Date.now();

                await Promise.all(
                    batch.map(customer => this.hubspotSyncService.syncCustomer(customer, hubspotId, connectId, user_id))
                );

                const batchEnd = Date.now();
                const batchDuration = ((batchEnd - batchStart) / 1000).toFixed(2);
                this.logger.log(
                    `Synced customers ${i + 1}–${Math.min(i + this.BATCH_SIZE, commonCustomers.length)} of ${commonCustomers.length} in current page. Batch took ${batchDuration} seconds.`
                );

                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }

        const end = Date.now();
        const duration = ((end - start) / 1000).toFixed(2);
        this.logger.log(`⏱ migrateShopifyContacts completed in ${duration} seconds`);
    }

    private mapToCommonCustomers(allContacts: any[]): CommonCustomer[] {
        return allContacts.map(contact => {
            const idParts = contact.id.split('/');
            const numericId = idParts[idParts.length - 1];

            // Merge defaultAddress and other addresses
            const rawAddresses: any[] = [];
            if (contact.defaultAddress) rawAddresses.push(contact.defaultAddress);
            if (Array.isArray(contact.addresses) && contact.addresses.length)
            {
                // exclude duplicate default if appears in addresses
                const others = contact.addresses.filter((addr: any) =>
                    !contact.defaultAddress ||
                    addr.address1 !== contact.defaultAddress.address1 ||
                    addr.zip !== contact.defaultAddress.zip
                );
                rawAddresses.push(...others);
            }

            const addresses: CommonAddress[] = rawAddresses.map((addr: any, idx: number) => ({
                first_name: contact.firstName || undefined,
                last_name: contact.lastName || undefined,
                company: addr.company || undefined,
                address1: addr.address1 || undefined,
                address2: addr.address2 || undefined,
                city: addr.city || undefined,
                province: addr.province || undefined,
                country: undefined,
                zip: addr.zip || undefined,
                phone: addr.phone || undefined,
                full_name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
                province_code: addr.province || undefined,
                country_code: addr.countryCodeV2 || undefined,
                country_name: undefined,
                default: idx === 0,
            }));

            // phone priority: contact.phone, else first non-empty address phone
            const phone: string | undefined = contact.phone
                ? contact.phone
                : addresses.map(a => a.phone).find(p => !!p) as string | undefined;

            return {
                id: numericId,
                platform: 'shopify',
                email: contact.email,
                created_at: undefined,
                first_name: contact.firstName || undefined,
                last_name: contact.lastName || undefined,
                full_name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
                note: undefined,
                verified_email: undefined,
                currency: undefined,
                phone,
                addresses,
            };
        });
    }


    //sync order

    async migrateShopifyOrders(data: StartMigrateHubspotDto, shopifyId: string, hubspotId: string, connectId: string, user_id: string) {
        const start = Date.now();
        const shopify = await this.appModel.findOne({ _id: shopifyId }).exec();
        const shop: any = shopify?.credentials;
        const shopDomain = shop.shopUrl;
        const accessToken = shop.accessToken;

        let hasNextPage = true;
        let after: string | null = null;
        const first = 250;
        const queryFilter = data.sync_from && data.sync_to
            ? `created_at:>${data.sync_from} created_at:<${data.sync_to}`
            : '';

        if (queryFilter) this.logger.debug(`Shopify query filter (orders): ${queryFilter}`);

        while (hasNextPage)
        {
            const args = this.buildGraphqlArgs(first, after, queryFilter);
            const graphqlQuery = `
            query {
                orders(${args}) {
                    pageInfo { hasNextPage endCursor }
                    edges { node {
                        id name createdAt updatedAt note currencyCode unpaid totalPrice
                        customer { id email firstName lastName phone }
                        billingAddress { address1 address2 city province country zip }
                        shippingAddress { address1 address2 city province country zip }
                        lineItems(first: 250) {
                            edges { node { product { id title descriptionHtml } variant { id sku price inventoryQuantity } quantity totalDiscount taxLines { price } } }
                        }
                    } }
                }
            }
        `;

            const dataNode = (await this.fetchPage(graphqlQuery, shopDomain, accessToken)).orders;
            hasNextPage = dataNode.pageInfo.hasNextPage;
            after = dataNode.pageInfo.endCursor;
            const orders = dataNode.edges.map((e: any) => e.node);
            // this.logger.debug(`Fetched orders page: hasNextPage=${hasNextPage}, endCursor=${after}`);
            console.log("check fetched order: ", orders);
            const commonOrders = this.mapToCommonOrders(orders);

            const BATCH_SIZE = Number(process.env.BATCH_SIZE_ORDER) || 2;
            for (let i = 0; i < commonOrders.length; i += BATCH_SIZE)
            {
                const batch = commonOrders.slice(i, i + BATCH_SIZE);
                const batchStart = Date.now();

                Promise.all(
                    batch.map(order => this.hubspotSyncService.syncOrder(order, hubspotId, connectId, user_id))
                );

                const batchEnd = Date.now();
                const batchDuration = ((batchEnd - batchStart) / 1000).toFixed(2);

                this.logger.log(
                    `Synced orders ${i + 1}–${Math.min(i + BATCH_SIZE, commonOrders.length)} of ${commonOrders.length} in current page. Batch took ${batchDuration} seconds.`
                );

                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }

        const end = Date.now();
        const duration = ((end - start) / 1000).toFixed(2);
        this.logger.log(`⏱ migrateShopifyOrders completed in ${duration} seconds`);
    }

    mapToCommonOrders(allOrders: any[]): CommonOrder[] {
        return allOrders.map(order => {
            const idParts = order.id.split('/');
            const numericId = idParts[idParts.length - 1];

            let customer: CommonCustomer | undefined;
            if (order.customer)
            {
                const c = order.customer;
                const [f, l] = [c.firstName || '', c.lastName || ''];
                customer = {
                    id: c.id.split('/').pop(),
                    platform: 'shopify',
                    email: c.email,
                    first_name: f || undefined,
                    last_name: l || undefined,
                    full_name: [f, l].filter(Boolean).join(' ') || undefined,
                    phone: c.phone || undefined,
                    addresses: [],
                };
            }

            const products: CommonProduct[] = [];
            for (const edge of order.lineItems.edges)
            {
                const node = edge.node;

                // Nếu không có product.id thì bỏ qua record này
                if (!node.product?.id)
                {
                    continue;
                }

                const prodId = node.product.id.split('/').pop()!;
                products.push({
                    id: prodId,
                    platform: 'shopify',
                    name: node.product.title,
                    description: node.product.descriptionHtml,
                    price: node.variant.price,
                    sku: node.variant.sku || undefined,
                    quantity: node.quantity,
                    inventory: node.variant.inventoryQuantity,
                    status: true,
                    tags: [],
                    images: [],
                    created_at: undefined,
                    vendor: undefined,
                    taxable: node.taxLines.length > 0,
                    tax: node.taxLines.reduce((sum: number, t: any) => sum + parseFloat(t.price), 0),
                });
            }



            const shipping: CommonAddress | undefined = order.shippingAddress ? {
                address1: order.shippingAddress.address1 || undefined,
                address2: order.shippingAddress.address2 || undefined,
                city: order.shippingAddress.city || undefined,
                province: order.shippingAddress.province || undefined,
                country: order.shippingAddress.country || undefined,
                zip: order.shippingAddress.zip || undefined,
                default: false,
            } : undefined;


            const common: CommonOrder = {
                id: numericId,
                title: order.name,
                platform: 'shopify',
                customer,
                products,
                tax_unit: TaxUnit.AMOUNT,
                shipping_cost: 0,
                shipping_address: shipping,
                is_paid: !order.unpaid,
                total_price: parseFloat(order.totalPrice || 0),
                payment_method: undefined,
                total_discount: 0,
                currency: order.currencyCode || "",
                created_at: order.createdAt,
                updated_at: order.updatedAt,
                notes: order.note || undefined,
            };

            return common;
        });


    }
    //sync product

    async migrateShopifyProducts(data: StartMigrateHubspotDto, shopifyId: string, hubspotId: string, connectId: string, user_id: string) {
        const start = Date.now();
        const shopify = await this.appModel.findOne({ _id: shopifyId }).exec();
        const shop: any = shopify?.credentials;
        const shopDomain = shop.shopUrl;
        const accessToken = shop.accessToken;

        let hasNextPage = true;
        let after: string | null = null;
        const first = 250;
        const queryFilter = data.sync_from && data.sync_to
            ? `created_at:>${data.sync_from} created_at:<${data.sync_to}`
            : '';

        if (queryFilter) this.logger.debug(`Shopify query filter (products): ${queryFilter}`);

        while (hasNextPage)
        {
            const args = this.buildGraphqlArgs(first, after, queryFilter);
            const graphqlQuery = `
            query {
                products(${args}) {
                    pageInfo { hasNextPage endCursor }
                    edges { node {
                        id
                        title
                        status
                        createdAt
                        updatedAt
                        bodyHtml
                        handle
                        variants(first: 250) {
                            edges { node { id sku price inventoryQuantity } }
                        }
                        images(first: 250) {
                            edges {
                                node {
                                    id
                                    originalSrc
                                }
                            }
                        }
                    } }
                }
            }
        `;

            const dataNode = (await this.fetchPage(graphqlQuery, shopDomain, accessToken)).products;
            hasNextPage = dataNode.pageInfo.hasNextPage;
            after = dataNode.pageInfo.endCursor;
            const products = dataNode.edges.map((e: any) => e.node);
            this.logger.debug(`Fetched products page: hasNextPage=${hasNextPage}, endCursor=${after}`);

            const commonProducts = this.mapToCommonProducts(products);

            for (let i = 0; i < commonProducts.length; i += this.BATCH_SIZE)
            {
                const batch = commonProducts.slice(i, i + this.BATCH_SIZE);
                const batchStart = Date.now();

                await Promise.all(
                    batch.map(prod => this.hubspotSyncService.syncProduct(prod, hubspotId, connectId, user_id))
                );

                const batchEnd = Date.now();
                const batchDuration = ((batchEnd - batchStart) / 1000).toFixed(2);

                this.logger.log(
                    `Synced products ${i + 1}–${Math.min(i + this.BATCH_SIZE, commonProducts.length)} of ${commonProducts.length} in current page. Batch took ${batchDuration} seconds.`
                );

                await new Promise(resolve => setTimeout(resolve, 500));
            }

        }

        const end = Date.now();
        const duration = ((end - start) / 1000).toFixed(2);
        this.logger.log(`⏱ migrateShopifyProducts completed in ${duration} seconds`);
    }

    mapToCommonProducts(allProducts: any[]): CommonProduct[] {
        return allProducts.map(prod => {
            const firstVariant = prod.variants?.edges?.[0]?.node || {};
            const idParts = prod.id.split('/');
            const numericId = idParts[idParts.length - 1];

            const images = prod.images?.edges?.map(edge => edge.node.originalSrc) || [];

            const common: CommonProduct = {
                id: numericId,
                platform: 'shopify',
                name: prod.title,
                description: prod.bodyHtml,
                type: undefined,
                vendor: undefined,
                status: prod.status === 'ACTIVE',
                tags: [],
                created_at: prod.createdAt,
                price: firstVariant.price,
                sku: firstVariant.sku || "DEFAULT_SKU",
                quantity: firstVariant.inventoryQuantity,
                inventory: firstVariant.inventoryQuantity,
                taxable: undefined,
                tax: undefined,
                images,
                width: undefined,
                height: undefined,
                weight: undefined,
            };

            return common;
        });
    }


}
