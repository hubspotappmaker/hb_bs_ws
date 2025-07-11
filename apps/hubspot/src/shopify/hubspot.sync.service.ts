import { CommonProduct } from "@app/common/interface/data/product.type";
import { HttpService } from "@nestjs/axios";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { HubspotCredentialService } from "../hubspot.credential.service";
import { CommonCustomer } from "@app/common/interface/data/customer.type";
import { CommonOrder } from "@app/common/interface/data/order.type";
import { DatafieldService } from "apps/shopify/src/metafield/datafield.service";
import { ShopifyTranferTohubspot } from "@app/common/interface/shopify/shopify.metafield";
import { CommonModuleName } from "@app/common/interface/enum/module.enum";
import { from } from "rxjs";
import { LogDataService } from "@app/common/util/log/log.data.service";
import { HubspotOrtherDataService } from "./hubspot.additional.service";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Connect } from "@app/common/schemas/connect.schema";

@Injectable()
export class HubspotSyncService {
    private readonly baseUrl = 'https://api.hubapi.com/crm/v3/objects/products';

    constructor(
        private readonly httpService: HttpService,
        private readonly hubspotCredentialService: HubspotCredentialService,
        @Inject(forwardRef(() => DatafieldService))
        private readonly datafieldService: DatafieldService,
        private readonly logDataService: LogDataService,
        private readonly hubspotOrtherDataService: HubspotOrtherDataService,
        @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
    ) { }

    async syncProduct(data: CommonProduct, hubspotId: string, connectId?: string, user_id?: string) {
        const pointConnect = await this.connectModel.findOne({ _id: connectId })
            .populate('to');


        //@ts-ignore
        const prefix: string = pointConnect?.to.credentials.prefix;
        const lowerPrefix = prefix ? prefix.toLocaleLowerCase() : '';
        try
        {
            const token = await this.hubspotCredentialService.getToken(hubspotId);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const properties = {
                'name': data.name || '',
                'hs_images': Array.isArray(data.images) ? data.images.join(',') : data.images || '',
                ['sku_' + lowerPrefix]: data.sku || '',
                ['id_' + lowerPrefix]: data.id || '',
                ['shop_' + lowerPrefix]: data.vendor || '',
                ['quantity_' + lowerPrefix]: data.quantity || '',
                'price': data.price || '0',
                'hs_product_type': 'inventory',
                'description': data.description || '',
            };

            console.log("check properties: ", properties);

            const searchUrl = `${this.baseUrl}/search`;
            const searchBody = {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'id_' + lowerPrefix,
                                operator: 'EQ',
                                value: data.id,
                            },
                        ],
                    },
                ],
            };

            const searchResponse = await this.httpService
                .post(searchUrl, searchBody, { headers })
                .toPromise();

            const results = searchResponse?.data.results || [];

            let hsProductId: string = '';

            if (results.length > 0)
            {
                const existingId = results[0].id;
                const updateUrl = `${this.baseUrl}/${existingId}`;
                await this.httpService
                    .patch(updateUrl, { properties }, { headers })
                    .toPromise();
                console.log(`Updated HubSpot product with id=${existingId}`);
                hsProductId = existingId;
            } else
            {
                const createResponse = await this.httpService
                    .post(this.baseUrl, { properties }, { headers })
                    .toPromise();
                const newId = createResponse?.data.id;
                console.log('Created new HubSpot product');

                hsProductId = newId;
            }

            //extra step: sync metafield
            const credential: ShopifyTranferTohubspot = {
                connect_id: connectId!,
                module: CommonModuleName.PRODUCT,
                from: data.id!,
                to: hsProductId
            }

            this.datafieldService.tranferShopifyMetaFieldToHubspot(credential)

            this.hubspotOrtherDataService.addOrtherProductDataToHubspot(
                data.id!,
                hsProductId,
                connectId!,
                lowerPrefix
            )

            this.logDataService.logDataSync({
                status: true,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.PRODUCT,
                dataPush: data,
                message: {
                    statu: 'Success'
                }
            }, `${data.name!} - ${data.sku ? data.sku : "No SKU"}`)
            return hsProductId

        } catch (error)
        {
            console.error('Error syncing product to HubSpot:', error.response?.data || error.message);
            this.logDataService.logDataSync({
                status: false,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.PRODUCT,
                dataPush: data,
                message: {
                    statu: error.response?.data || error.message
                }
            }, `${data.name!} - ${data.sku ? data.sku : "No SKU"}`)
        }
    }

    async syncCustomer(data: CommonCustomer, hubspotId: string, connectId?: string, user_id?: string) {
        // console.log("check CommonCustomer: ", data)
        const pointConnect = await this.connectModel.findOne({ _id: connectId })
            .populate('to');

        //@ts-ignore
        const prefix: string = pointConnect?.to.credentials.prefix;
        const lowerPrefix = prefix ? prefix.toLocaleLowerCase() : '';
        try
        {
            const token = await this.hubspotCredentialService.getToken(hubspotId);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const addr = data.addresses?.find(a => a.default) || data.addresses?.[0] || {};
            const street = [addr.address1, addr.address2].filter(Boolean).join(' ');

            const properties = {
                'firstname': data.first_name || '',
                'lastname': data.last_name || '',
                'email': data.email || '',
                'phone': data.phone || '',
                ['shop_' + lowerPrefix]: data.platform || '',
                ['id_' + lowerPrefix]: data.id || '',
                'address': street,
                'zip': addr.zip || '',
                'city': addr.city || '',
                'country': addr.country || '',
                'company': addr.company || '',
                ['tag_' + lowerPrefix]: ""
            };

            const searchUrl = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
            const searchBody = {
                filterGroups: [{
                    filters: [{
                        propertyName: 'id_' + lowerPrefix,
                        operator: 'EQ',
                        value: data.id,
                    }],
                }],
            };

            const searchResponse = await this.httpService
                .post(searchUrl, searchBody, { headers })
                .toPromise();

            const results = searchResponse?.data.results || [];
            let hsCustomerId: string = ""
            if (results.length > 0)
            {
                const existingId = results[0].id;
                const updateUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`;
                await this.httpService
                    .patch(updateUrl, { properties }, { headers })
                    .toPromise();
                console.log(`Updated HubSpot contact with id=${existingId}`);
                hsCustomerId = existingId;
            } else
            {
                const createUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';
                const createResponse = await this.httpService
                    .post(createUrl, { properties }, { headers })
                    .toPromise();
                const newId = createResponse?.data.id;
                console.log('Created new HubSpot contact');
                hsCustomerId = newId;
            }

            //extra step: sync metafield
            const credential: ShopifyTranferTohubspot = {
                connect_id: connectId!,
                module: CommonModuleName.CUSTOMER,
                from: data.id!,
                to: hsCustomerId
            }

            this.datafieldService.tranferShopifyMetaFieldToHubspot(credential)
            //transfer tag and email/sms data
            this.hubspotOrtherDataService.addOrtherContactDataToHubspot(
                data.id!,
                hsCustomerId,
                connectId!,
                lowerPrefix
            )

            this.logDataService.logDataSync({
                status: true,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.CUSTOMER,
                dataPush: data,
                message: {
                    statu: "success"
                }
            }, `${data.full_name!} - ${data.email ? data.email : "No Email"}`)
            return hsCustomerId
        } catch (error)
        {
            console.error('Error syncing customer to HubSpot:', error.response?.data || error.message);
            this.logDataService.logDataSync({
                status: false,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.CUSTOMER,
                dataPush: data,
                message: {
                    statu: error.response?.data || error.message
                }
            }, `${data.full_name!} - ${data.email ? data.email : "No Email"}`)
        }
    }

    async syncOrder(data: CommonOrder, hubspotId: string, connectId?: string, user_id?: string): Promise<void> {
        const pointConnect = await this.connectModel.findOne({ _id: connectId })
            .populate('to');

        //@ts-ignore
        const rawPrefix = pointConnect?.to.credentials.prefix;
        const lowerPrefix = rawPrefix ? rawPrefix.toLocaleLowerCase() : '';
        try
        {
            // 1. Retrieve authentication token from HubSpot
            const token = await this.hubspotCredentialService.getToken(hubspotId);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            // 2. Sync customer (if exists) and get contactId
            let contactId: string | undefined;
            if (data.customer)
            {
                contactId = await this.syncCustomer(data.customer, hubspotId, connectId, user_id);
            }

            // 3. Sync products (if any) to get hubspotProductIds
            const productsToLink: Array<{ hubspotProductId: string; quantity: number; price: number | string }> = [];
            if (data.products && data.products.length > 0)
            {
                for (const p of data.products)
                {
                    const hubspotProductId = await this.syncProduct(p, hubspotId, connectId, user_id);
                    if (!hubspotProductId)
                    {
                        continue;
                    }
                    productsToLink.push({
                        hubspotProductId,
                        quantity: p.quantity ?? 1,
                        price: p.price || 0,
                    });
                }
            }

            // 4. Determine deal type
            const dealtype = data.customer?.id ? 'existingbusiness' : 'newbusiness';

            // 5. Search for existing Deal (by id_fconnector)
            const searchDealUrl = 'https://api.hubapi.com/crm/v3/objects/deals/search';
            const searchDealBody = {
                filterGroups: [{
                    filters: [{
                        propertyName: 'id_' + lowerPrefix,
                        operator: 'EQ',
                        value: data.id,
                    }],
                }],
            };
            const searchRes = await this.httpService
                .post(searchDealUrl, searchDealBody, { headers })
                .toPromise();
            const existingDeals = searchRes?.data.results as any[];

            // 6. Create or update Deal
            let dealId: string;
            if (existingDeals.length > 0)
            {
                const lowerPrefix = rawPrefix ? rawPrefix.toLocaleLowerCase() : '';
                dealId = existingDeals[0].id;
                const updateUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
                const updateBody = {
                    properties: {
                        'dealname': `${data.title}`,
                        'amount': data.total_price?.toString() ?? '0',
                        'dealstage': data.is_paid ? 'closedwon' : 'qualifiedtobuy',
                        'closedate': data.created_at ?? new Date().toISOString(),
                        'dealtype': dealtype,
                        ['id_' + lowerPrefix]: data.id,
                        ['shop_' + lowerPrefix]: data.platform ?? '',
                    },
                };
                // console.log("check order properties: ", updateBody)
                await this.httpService.patch(updateUrl, updateBody, { headers }).toPromise();
                console.log(`Updated Deal id=${dealId}`);
            } else
            {
                const lowerPrefix = rawPrefix ? rawPrefix.toLocaleLowerCase() : '';
                const createUrl = 'https://api.hubapi.com/crm/v3/objects/deals';
                const createBody = {
                    properties: {
                        'dealname': `${data.title}`,
                        'pipeline': 'default',
                        'dealstage': data.is_paid ? 'closedwon' : 'qualifiedtobuy',
                        'amount': data.total_price?.toString() ?? '0',
                        'closedate': data.created_at ?? new Date().toISOString(),
                        'dealtype': dealtype,
                        ['id_' + lowerPrefix]: data.id,
                        ['shop_' + lowerPrefix]: data.platform ?? '',
                        ['payment_' + lowerPrefix]: data.is_paid ? 'Paid' : 'Un Paid',
                    },

                };

                // console.log("check order properties: ", createBody)
                const createRes = await this.httpService.post(createUrl, createBody, { headers }).toPromise();
                dealId = createRes?.data.id;
                // console.log(`Created new Deal id=${dealId}`);
            }

            //extra step: sync metafield
            const credential: ShopifyTranferTohubspot = {
                connect_id: connectId!,
                module: CommonModuleName.ORDER,
                from: data.id!,
                to: dealId
            }

            this.datafieldService.tranferShopifyMetaFieldToHubspot(credential)

            // 7. Remove old contacts (if any)
            const getContactsUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?associations=contacts`;
            const contactsRes = await this.httpService.get(getContactsUrl, { headers }).toPromise();
            const existingContacts = contactsRes?.data.associations?.contacts?.results || [];
            if (existingContacts.length > 0)
            {
                const archiveContactsUrl = 'https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/archive';
                const archiveContactsBody = {
                    inputs: [
                        {
                            from: { id: dealId },
                            to: existingContacts.map((c: any) => ({ id: c.id })),
                        },
                    ],
                };
                await this.httpService.post(archiveContactsUrl, archiveContactsBody, { headers }).toPromise();
                // console.log(`Removed ${existingContacts.length} old contacts from Deal ${dealId}`);
            }

            // 8. Associate new contact (if any)
            if (contactId)
            {
                const assocContactUrl = 'https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/create';
                const assocContactBody = {
                    inputs: [{
                        from: { id: dealId },
                        to: { id: contactId },
                        type: 'deal_to_contact',
                    }],
                };
                await this.httpService.post(assocContactUrl, assocContactBody, { headers }).toPromise();
                // console.log(`Linked Contact ${contactId} to Deal ${dealId}`);
            }

            // 9. Remove old line items (if any)
            const getAssocUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?associations=line_item`;
            const assocRes = await this.httpService.get(getAssocUrl, { headers }).toPromise();
            const existingLI = assocRes?.data.associations?.['line items']?.results || [];
            if (existingLI.length > 0)
            {
                const archiveLIUrl = 'https://api.hubapi.com/crm/v4/associations/deals/line_items/batch/archive';
                const archiveLIBody = {
                    inputs: [
                        {
                            from: { id: dealId },
                            to: existingLI.map((li: any) => ({ id: li.id })),
                        },
                    ],
                };
                await this.httpService.post(archiveLIUrl, archiveLIBody, { headers }).toPromise();
                // console.log(`Removed ${existingLI.length} old line items from Deal ${dealId}`);
            }

            // 10. Create and associate new line items
            for (const item of productsToLink)
            {
                // 10.1. Create line item
                const createLIUrl = 'https://api.hubapi.com/crm/v3/objects/line_items';
                const liBody = {
                    properties: {
                        hs_product_id: item.hubspotProductId,
                        quantity: item.quantity.toString(),
                        price: item.price.toString(),
                    },
                };
                const liRes = await this.httpService.post(createLIUrl, liBody, { headers }).toPromise();
                const lineItemId = liRes?.data.id;
                // console.log(`Created line item id=${lineItemId}`);

                // 10.2. Associate line item with Deal
                const assocLIUrl = `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}/associations/deals/${dealId}/20`;
                await this.httpService.put(assocLIUrl, null, { headers }).toPromise();
                // console.log(`Linked line item ${lineItemId} to Deal ${dealId}`);
            }

            this.hubspotOrtherDataService.addOrtherOrderDataToHubspot(
                data.id!,
                dealId,
                connectId!,
                lowerPrefix
            )

            this.logDataService.logDataSync({
                status: true,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.ORDER,
                dataPush: data,
                message: {
                    statu: "Success"
                }
            },
                `${data.id!}`
            )
        } catch (error)
        {
            console.error('Error syncing order to HubSpot:', error.response?.data ?? error.message);
            this.logDataService.logDataSync({
                status: false,
                connect: connectId as any,
                user: user_id as any,
                module: CommonModuleName.ORDER,
                dataPush: data,
                message: {
                    statu: error.response?.data ?? error.message
                }
            }, `${data.id!}`)
        }
    }




}
