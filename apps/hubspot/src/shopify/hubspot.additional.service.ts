import { HubspotUpdatePayload, ShopifyCustomerResponse } from "@app/common/interface/response/shopify.response";
import { Connect } from "@app/common/schemas/connect.schema";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { lastValueFrom } from "rxjs";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";

@Injectable()
export class HubspotOrtherDataService {
  private readonly logger = new Logger(HubspotOrtherDataService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
  ) { }

  async addOrtherContactDataToHubspot(
    shopifyCustomerId: string,
    hubspotContactID: string,
    connectID: string,
    prefix: string,
  ): Promise<any> {
    const existConnect = await this.connectModel.findOne({
      _id: connectID
    }).populate('from').populate('to');

    //@ts-ignore
    const shopifyShopUrl = existConnect.from.credentials.shopUrl;
    //@ts-ignore
    const shopifyToken = existConnect.from.credentials.accessToken;
    //@ts-ignore
    const hubspotApiKey = existConnect.to.credentials.access_token;

    const globalCustomerId = `gid://shopify/Customer/${shopifyCustomerId}`;
    console.log("check globalCustomerId: ", globalCustomerId);
    console.log("check shopifyShopUrl: ", shopifyShopUrl);
    console.log("check shopifyToken: ", shopifyToken);
    console.log("check hubspotApiKey: ", hubspotApiKey);

    try
    {
      // 1. Query customer data from Shopify with added address fields and product details
      const gqlQuery = {
        query: `
          query getCustomerData($customerId: ID!) {
            customer(id: $customerId) {
              id
              note
              email
              tags
              emailMarketingConsent { marketingState }
              smsMarketingConsent { marketingState }
              lastOrder: orders(first: 1, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id
                    name
                    displayFulfillmentStatus
                    confirmationNumber
                    displayFinancialStatus
                    fulfillments(first: 1) {
                      trackingInfo {
                        company
                        number
                        url
                      }
                      createdAt
                    }
                    billingAddress {
                      address1
                      address2
                      city
                      country
                      phone
                      zip
                      province
                    }
                    shippingAddress {
                      address1
                      address2
                      city
                      country
                      phone
                      zip
                      province
                    }
                    lineItems(first: 3, reverse: true) {
                      edges {
                        node {
                          product {
                            id
                            title
                            descriptionHtml
                            tags
                            vendor
                            productType
                            onlineStoreUrl
                            images(first: 1) {
                              edges {
                                node {
                                  src
                                }
                              }
                            }
                          }
                          variant {
                            price
                          }
                        }
                      }
                    }
                  }
                }
              }
              unpaidOrders: orders(first: 250, query: "financial_status:pending OR financial_status:authorized") {
                edges {
                  node {
                    id
                  }
                }
                pageInfo {
                  hasNextPage
                }
              }
            }
          }
        `,
        variables: {
          customerId: globalCustomerId
        }
      };

      const shopifyResponse$ = this.httpService.post(
        `${shopifyShopUrl}/admin/api/2025-04/graphql.json`,
        gqlQuery,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopifyToken,
          },
        },
      );
      const shopifyResponse = await lastValueFrom(shopifyResponse$);

      const customer = shopifyResponse.data.data.customer;
      const lastOrder = customer.lastOrder?.edges[0]?.node;
      const fulfillments = lastOrder?.fulfillments?.[0];
      const trackingInfo = fulfillments?.trackingInfo || [];
      const billingAddress = lastOrder?.billingAddress;
      const shippingAddress = lastOrder?.shippingAddress;
      console.log("check shopifyResponse.data.data: ", JSON.stringify(shopifyResponse.data.data));

      // 2. Prepare payload for HubSpot to update contact
      const emailState = customer.emailMarketingConsent?.marketingState ?? 'N/A';
      const smsState = customer.smsMarketingConsent?.marketingState ?? 'N/A';
      const tagsString = Array.isArray(customer.tags) && customer.tags.length ? customer.tags.join(', ') : 'N/A';

      // Last Order Fulfillment Status
      const lastOrderFulfillmentStatus = lastOrder?.displayFulfillmentStatus || 'N/A';

      // Last Order Number
      const lastOrderNumber = lastOrder?.confirmationNumber || 'N/A';

      // Last Order Order Source
      const orderId = lastOrder?.id?.split('/').pop() || 'N/A';
      const lastOrderSource = orderId !== 'N/A' ? `https://admin.shopify.com/orders/${orderId}` : 'N/A';

      // Last Order Shipment Carrier
      const shipmentCarriers = trackingInfo.map(info => info.company).filter(Boolean).join(', ') || 'N/A';

      // Last Order Shipment Date
      const shipmentDate = fulfillments?.createdAt || 'N/A';

      // Last Order Status
      const lastOrderStatus = lastOrder?.displayFinancialStatus || 'N/A';

      // Last Order Tracking Number
      const trackingNumbers = trackingInfo.map(info => info.number).filter(Boolean).join(', ') || 'N/A';

      // Last Order Tracking URL
      const trackingUrls = trackingInfo.map(info => info.url).filter(Boolean).join(', ') || 'N/A';

      // Unpaid Orders Count
      const unpaidOrdersCount = customer.unpaidOrders?.edges?.length || 0;

      // Extract line items from the last order
      const lineItems = lastOrder?.lineItems?.edges || [];

      // Map line items to product objects
      const products = lineItems.map(edge => ({
        title: edge.node.product.title,
        price: edge.node.variant.price,
        imageUrl: edge.node.product.images?.edges[0]?.node?.src || 'N/A',
        url: edge.node.product.onlineStoreUrl || 'N/A',
        productType: edge.node.product.productType || 'N/A',
        vendor: edge.node.product.vendor || 'N/A',
        tags: edge.node.product.tags || []
      }));

      // Individual product details
      const product1 = products[0] || {};
      const product2 = products[1] || {};
      const product3 = products[2] || {};

      const hubspotPayload = {
        properties: {
          [`email_subscription_${prefix}`]: emailState,
          [`sms_subscription_${prefix}`]: smsState,
          [`tag_${prefix}`]: tagsString,
          //Last Order Fields
          [`last_order_fulfillment_status_${prefix}`]: lastOrderFulfillmentStatus,
          [`last_order_number_${prefix}`]: lastOrderNumber,
          [`last_order_source_${prefix}`]: lastOrderSource,
          [`last_order_shipment_carrier_${prefix}`]: shipmentCarriers,
          [`last_order_shipment_date_${prefix}`]: shipmentDate,
          [`last_order_status_${prefix}`]: lastOrderStatus,
          [`last_order_tracking_number_${prefix}`]: trackingNumbers,
          [`last_order_tracking_url_${prefix}`]: trackingUrls,
          [`unpaid_orders_count_${prefix}`]: unpaidOrdersCount < 99 ? unpaidOrdersCount.toString() : '99+',
          // Billing Address Fields
          [`billing_address_line_1_${prefix}`]: billingAddress?.address1 || 'N/A',
          [`billing_address_line_2_${prefix}`]: billingAddress?.address2 || 'N/A',
          [`billing_city_${prefix}`]: billingAddress?.city || 'N/A',
          [`billing_country_${prefix}`]: billingAddress?.country || 'N/A',
          [`billing_phone_${prefix}`]: billingAddress?.phone || 'N/A',
          [`billing_postal_code_${prefix}`]: billingAddress?.zip || 'N/A',
          [`billing_state_${prefix}`]: billingAddress?.province || 'N/A',
          // Shipping Address Fields
          [`shipping_address_line_1_${prefix}`]: shippingAddress?.address1 || 'N/A',
          [`shipping_address_line_2_${prefix}`]: shippingAddress?.address2 || 'N/A',
          [`shipping_city_${prefix}`]: shippingAddress?.city || 'N/A',
          [`shipping_country_${prefix}`]: shippingAddress?.country || 'N/A',
          [`shipping_phone_${prefix}`]: shippingAddress?.phone || 'N/A',
          [`shipping_postal_code_${prefix}`]: shippingAddress?.zip || 'N/A',
          [`shipping_state_${prefix}`]: shippingAddress?.province || 'N/A',
          // Individual product fields
          [`last_products_bought_product_1_name_${prefix}`]: product1.title || 'N/A',
          [`last_products_bought_product_1_price_${prefix}`]: product1.price || 'N/A',
          [`last_products_bought_product_1_image_url_${prefix}`]: product1.imageUrl || 'N/A',
          [`last_products_bought_product_1_url_${prefix}`]: product1.url || 'N/A',
          [`last_products_bought_product_2_name_${prefix}`]: product2.title || 'N/A',
          [`last_products_bought_product_2_price_${prefix}`]: product2.price || 'N/A',
          [`last_products_bought_product_2_image_url_${prefix}`]: product2.imageUrl || 'N/A',
          [`last_products_bought_product_2_url_${prefix}`]: product2.url || 'N/A',
          [`last_products_bought_product_3_name_${prefix}`]: product3.title || 'N/A',
          [`last_products_bought_product_3_price_${prefix}`]: product3.price || 'N/A',
          [`last_products_bought_product_3_image_url_${prefix}`]: product3.imageUrl || 'N/A',
          [`last_products_bought_product_3_url_${prefix}`]: product3.url || 'N/A',
          // Aggregate fields
          [`last_categories_bought_${prefix}`]: [...new Set(products.map(p => p.productType))].join(', ') || 'N/A',
          [`last_vendors_bought_${prefix}`]: [...new Set(products.map(p => p.vendor))].join(', ') || 'N/A',
          [`last_total_number_of_products_bought_${prefix}`]: products.length.toString(),
          [`shopify_product_tags_${prefix}`]: [...new Set(products.flatMap(p => p.tags))].join(', ') || 'N/A',
          [`last_products_bought_${prefix}`]: products.map(p => p.title).join(', ') || 'N/A',
          [`last_products_bought_html_${prefix}`]: products.map(p => `<div><img src="${p.imageUrl}" alt="${p.title}" width="50"><p>${p.title} - ${p.price}</p></div>`).join('') || 'N/A',
          // Non-"Last" fields using last order data
          [`categories_bought_${prefix}`]: [...new Set(products.map(p => p.productType))].join(', ') || 'N/A',
          [`product_types_bought_${prefix}`]: [...new Set(products.map(p => p.productType))].join(', ') || 'N/A',
          [`products_bought_${prefix}`]: products.map(p => p.title).join(', ') || 'N/A',
          // Additional fields
          [`last_product_bought_${prefix}`]: product1.title || 'N/A',
          [`last_product_types_bought_${prefix}`]: [...new Set(products.map(p => p.productType))].join(', ') || 'N/A',
        },
      };
      console.log("check hubspotPayload: ", hubspotPayload);

      // 3. Call HubSpot API to update contact
      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactID}`;
      const hubspotResponse$ = this.httpService.patch(
        hubspotUrl,
        hubspotPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${hubspotApiKey}`,
          },
        },
      );

      const hubspotResponse = await lastValueFrom(hubspotResponse$);
      this.logger.log(`HubSpot contact updated: ${JSON.stringify(hubspotPayload)}`);

      // 4. Check if customer.note is not empty and handle note creation
      if (customer.note && customer.note.trim() !== "")
      {
        // Search for existing notes with the same hs_note_body and associated with the contact
        const searchPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "associations.contact",
                  operator: "EQ",
                  value: hubspotContactID
                },
                {
                  propertyName: "hs_note_body",
                  operator: "EQ",
                  value: customer.note
                }
              ]
            }
          ],
          properties: ["hs_note_body"],
          limit: 1
        };

        const searchUrl = `https://api.hubapi.com/crm/v3/objects/notes/search`;
        const searchResponse$ = this.httpService.post(searchUrl, searchPayload, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${hubspotApiKey}`,
          },
        });

        const searchResponse = await lastValueFrom(searchResponse$);

        if (searchResponse.data.total > 0)
        {
          this.logger.log(`A note with the same content already exists for contact ${hubspotContactID}.`);
        } else
        {
          // Create new note
          const notePayload = {
            properties: {
              hs_note_body: customer.note,
              hs_timestamp: new Date().toISOString(),
            },
            associations: [
              {
                to: {
                  id: hubspotContactID,
                },
                types: [
                  {
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 202, // Note-to-contact association type
                  },
                ],
              },
            ],
          };

          const noteUrl = `https://api.hubapi.com/crm/v3/objects/notes`;
          const noteResponse$ = this.httpService.post(noteUrl, notePayload, {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${hubspotApiKey}`,
            },
          });

          const noteResponse = await lastValueFrom(noteResponse$);
          this.logger.log(`HubSpot note created for contact ${hubspotContactID}: ${JSON.stringify(noteResponse.data)}`);
        }
      } else
      {
        this.logger.log(`No note to create for contact ${hubspotContactID} as customer.note is empty.`);
      }

    } catch (error)
    {
      this.logger.error("Failed to sync Shopify → HubSpot or create note", error.response?.data || error.message);
    }
  }

  async addOrtherProductDataToHubspot(
    shopifyProductId: string,
    hubspotContactID: string,
    connectID: string,
    prefix: string,
  ): Promise<any> {
    // console.log("check prefix: ", prefix)
    // 1. Lấy thông tin kết nối
    const existConnect = await this.connectModel.findOne({ _id: connectID })
      .populate('from')
      .populate('to');

    //@ts-ignore
    const shopifyShopUrl = existConnect.from.credentials.shopUrl;
    //@ts-ignore
    const shopifyToken = existConnect.from.credentials.accessToken;
    //@ts-ignore
    const hubspotApiKey = existConnect.to.credentials.access_token;

    // Chuyển sang định dạng Global ID của Shopify
    const globalProductId = `gid://shopify/Product/${shopifyProductId}`;

    try
    {
      // 2. Query product data từ Shopify
      const gqlQuery = {
        query: `
                  query {
                    shop {
                      taxesIncluded
                      taxShipping
                    }
                    product(id: "${globalProductId}") {
                      status
                      vendor
                      tags
                      productType
                      onlineStoreUrl
                      category {
                        name
                      }
                      collections(first: 10) {
                        edges {
                          node {
                            title
                          }
                        }
                      }
                      publications(first: 10) {
                        edges {
                          node {
                            channel {
                              name
                            }
                            isPublished
                            publishDate
                          }
                        }
                      }
                      variants(first: 250) {
                        edges {
                          node {
                            barcode
                            taxable
                            taxCode
                            inventoryItem {
                              requiresShipping
                              countryCodeOfOrigin
                              harmonizedSystemCode
                              measurement {
                                weight {
                                  value
                                  unit
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                `,
      };

      const shopifyResponse$ = this.httpService.post(
        `${shopifyShopUrl}/admin/api/2025-04/graphql.json`,
        gqlQuery,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifyToken,
          },
        },
      );
      const shopifyResponse = await lastValueFrom(shopifyResponse$);
      console.log("check shopifyResponse..data.data: ", JSON.stringify(shopifyResponse.data.data))
      const shop = shopifyResponse.data.data.shop;
      const product = shopifyResponse.data.data.product;
      const variant = product.variants.edges[0].node;

      // Extract additional data
      const publishedChannels = product.publications.edges
        .filter(edge => edge.node.isPublished)
        .map(edge => edge.node.channel.name)
        .join(', ') || 'N/A';

      const collections = product.collections.edges
        .map(edge => edge.node.title)
        .join(', ') || 'N/A';

      const shippingWeight = variant && variant.inventoryItem.measurement && variant.inventoryItem.measurement.weight
        ? `${variant.inventoryItem.measurement.weight.value} ${variant.inventoryItem.measurement.weight.unit}`
        : 'N/A';

      const country = variant && variant.inventoryItem.countryCodeOfOrigin
        ? variant.inventoryItem.countryCodeOfOrigin
        : 'N/A';

      const hsc = variant && variant.inventoryItem.harmonizedSystemCode
        ? variant.inventoryItem.harmonizedSystemCode
        : 'N/A';

      // 3. Chuẩn bị payload để update HubSpot contact
      const hubspotPayload = {
        properties: {
          [`tag_${prefix}`]: product.tags.join(', '),
          [`chargetax_${prefix}`]: shop.taxesIncluded.toString(),
          [`isphysical_${prefix}`]: variant.inventoryItem.requiresShipping ? 'yes' : 'no',
          [`barcode_${prefix}`]: variant.barcode,
          [`vendor_${prefix}`]: product.vendor,
          [`shop_${prefix}`]: product.onlineStoreUrl || 'N/A',
          [`status_${prefix}`]: product.status || 'N/A',
          [`publish_${prefix}`]: publishedChannels,
          [`category_${prefix}`]: product.category ? product.category.name : 'N/A',
          [`shoping_weight_${prefix}`]: shippingWeight,
          [`country_${prefix}`]: country,
          [`collection_${prefix}`]: collections,
          [`hsc_${prefix}`]: hsc,
          [`type_${prefix}`]: product.productType || 'N/A',
        },
      };

      // 4. Gọi HubSpot API để cập nhật contact
      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/products/${hubspotContactID}`;
      const hubspotResponse$ = this.httpService.patch(
        hubspotUrl,
        hubspotPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotApiKey}`,
          },
        },
      );
      await lastValueFrom(hubspotResponse$);

      this.logger.log(`HubSpot contact updated with product data: ${JSON.stringify(hubspotPayload)}`);
    } catch (error)
    {
      this.logger.error(
        `Failed to sync product ${shopifyProductId} → HubSpot or update contact`,
        error.response?.data || error.message,
      );
    }
  }



  async addOrtherOrderDataToHubspot(
    shopifyOrderID: string,
    hubspotDealID: string,
    connectID: string,
    prefix: string,
  ): Promise<any> {
    // 1. Lấy thông tin kết nối
    const existConnect = await this.connectModel.findOne({ _id: connectID })
      .populate('from')
      .populate('to');

    //@ts-ignore
    const shopifyShopUrl = existConnect.from.credentials.shopUrl;
    //@ts-ignore
    const shopifyToken = existConnect.from.credentials.accessToken;
    //@ts-ignore
    const hubspotApiKey = existConnect.to.credentials.access_token;

    // Chuyển sang định dạng Global ID của Shopify
    const globalOrderId = `gid://shopify/Order/${shopifyOrderID}`;

    try
    {
      // 2. Query order data từ Shopify
      const gqlQuery = {
        query: `
          query {
            order(id: "${globalOrderId}") {
              id
              name
              note
              tags
              totalPrice
              paymentGatewayNames
              totalRefundedSet { shopMoney { amount } }
              totalDiscountsSet { shopMoney { amount } }
              shippingLine { title price originalPriceSet { shopMoney { amount } } }
              totalTaxSet { shopMoney { amount } }
              displayFulfillmentStatus
              confirmationNumber
              displayFinancialStatus
              fulfillments(first: 1) { trackingInfo { company number url } createdAt }
              billingAddress { address1 address2 city country phone zip province }
              shippingAddress { address1 address2 city country phone zip province }
            }
          }
        `,
      };

      const shopifyResponse$ = this.httpService.post(
        `${shopifyShopUrl}/admin/api/2025-04/graphql.json`,
        gqlQuery,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifyToken,
          },
        },
      );
      const shopifyResponse = await lastValueFrom(shopifyResponse$);
      const order = shopifyResponse.data.data.order;

      // Tính toán các giá trị số học
      const totalPriceNum = parseFloat(order.totalPrice || '0');
      const shippingPriceNum = parseFloat(order.shippingLine?.price || '0');
      const taxAmountNum = parseFloat(order.totalTaxSet?.shopMoney.amount || '0');
      const orderValues = (totalPriceNum - shippingPriceNum - taxAmountNum).toString();
      const netValue = (totalPriceNum - taxAmountNum).toString();

      // Extract billing & shipping
      const billing = order.billingAddress || {};
      const shipping = order.shippingAddress || {};

      // Extract fulfillments
      const fulfill = order.fulfillments[0];
      const tracking = (fulfill?.trackingInfo || []) as any[];
      const trackingNumbers = tracking.map(t => t.number).join(', ') || 'N/A';
      const trackingUrls = tracking.map(t => t.url).filter(u => u).join(', ') || 'N/A';
      const orderSource = shopifyOrderID !== 'N/A' ? `https://admin.shopify.com/orders/${shopifyOrderID}` : 'N/A';

      // 3. Chuẩn bị payload để update HubSpot deal
      const hubspotPayload = {
        properties: {
          // Billing Address
          [`billing_address_line_1_${prefix}`]: billing.address1 || 'N/A',
          [`billing_address_line_2_${prefix}`]: billing.address2 || 'N/A',
          [`billing_city_${prefix}`]: billing.city || 'N/A',
          [`billing_country_${prefix}`]: billing.country || 'N/A',
          [`billing_phone_${prefix}`]: billing.phone || 'N/A',
          [`billing_postal_code_${prefix}`]: billing.zip || 'N/A',
          [`billing_state_${prefix}`]: billing.province || 'N/A',

          // Shipping Address
          [`shipping_address_line_1_${prefix}`]: shipping.address1 || 'N/A',
          [`shipping_address_line_2_${prefix}`]: shipping.address2 || 'N/A',
          [`shipping_city_${prefix}`]: shipping.city || 'N/A',
          [`shipping_country_${prefix}`]: shipping.country || 'N/A',
          [`shipping_phone_${prefix}`]: shipping.phone || 'N/A',
          [`shipping_postal_code_${prefix}`]: shipping.zip || 'N/A',
          [`shipping_state_${prefix}`]: shipping.province || 'N/A',

          // Order Group
          [`fulfillment_status_${prefix}`]: order.displayFulfillmentStatus || 'N/A',
          [`order_id_${prefix}`]: order.id || 'N/A',
          [`order_notes_${prefix}`]: order.note || 'N/A',
          [`order_number_${prefix}`]: order.name || 'N/A',
          [`order_source_${prefix}`]: orderSource,
          [`order_status_${prefix}`]: order.displayFinancialStatus || 'N/A',
          [`order_tags_${prefix}`]: (order.tags || []).join(', ') || 'N/A',
          [`order_tracking_number_${prefix}`]: trackingNumbers,
          [`order_tracking_url_${prefix}`]: trackingUrls,
          [`payment_title_${prefix}`]: (order.paymentGatewayNames || [])[0] || 'N/A',
          [`shipment_carrier_${prefix}`]: order.shippingLine?.title || 'N/A',
          [`shipment_date_${prefix}`]: fulfill?.createdAt || 'N/A',

          // Store Group
          [`order_values_${prefix}`]: orderValues,
          [`discounts_${prefix}`]: order.totalDiscountsSet?.shopMoney.amount || '0',
          [`gross_value_of_order_${prefix}`]: order.totalPrice || '0',
          [`net_value_of_order_${prefix}`]: netValue,
          [`refund_amount_${prefix}`]: order.totalRefundedSet?.shopMoney.amount || '0',
          [`shipping_${prefix}`]: order.shippingLine?.price || '0',
          [`tax_${prefix}`]: order.totalTaxSet?.shopMoney.amount || '0',
        },
      };
      console.log('check order hubspot hubspotPayload: ', hubspotPayload);
      // 4. Gọi HubSpot API để cập nhật deal
      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealID}`;
      const hubspotResponse$ = this.httpService.patch(
        hubspotUrl,
        hubspotPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotApiKey}`,
          },
        },
      );
      await lastValueFrom(hubspotResponse$);

      this.logger.log(`HubSpot deal updated with order data: ${JSON.stringify(hubspotPayload)}`);
    } catch (error)
    {
      this.logger.error(
        `Failed to sync order ${shopifyOrderID} → HubSpot deal ${hubspotDealID}`,
        error.response?.data || error.message,
      );
    }
  }



}

