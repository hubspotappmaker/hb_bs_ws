import { HttpService } from '@nestjs/axios';
import { Injectable, Res, BadRequestException, InternalServerErrorException, NotFoundException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom, Observable } from 'rxjs';
import { App, Field, Platform, User } from '@app/common';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { GroupConfig, PropertyConfig } from '@app/common/interface/type/request.type';
import { CommonApplicationService } from './common-application.service';
import { HubspotCredentialService } from 'apps/hubspot/src/hubspot.credential.service';
import { Connect } from '@app/common/schemas/connect.schema';

@Injectable()
export class HubspotApplicationService {
  private tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
  private tokenInfoUrl = 'https://api.hubapi.com/integrations/v1/me';

  constructor(
    @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
    @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
    @InjectModel(User.name) private readonly userModel: SoftDeleteModel<User>,
    @InjectModel(Connect.name) private readonly connectModel: SoftDeleteModel<Connect>,
    @InjectModel(Field.name) private readonly fieldModel: SoftDeleteModel<Field>,
    private readonly httpService: HttpService,
    private readonly commonApplicationService: CommonApplicationService,
    private readonly hubspotCredentialService: HubspotCredentialService
  ) { }

  async connectHubspot(code: string, state: string) {
    const { user_id, prefix } = JSON.parse(state)

    const proPrifix: string = prefix;

    if (!code || !user_id)
    {
      throw new BadRequestException('Missing required parameters: code or user_id');
    }

    const existuser = await this.userModel.findOne({ _id: user_id });
    if (!existuser)
    {
      throw new NotFoundException('Not found user with this id');
    }

    if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET || !process.env.HUBSPOT_REDIRECT_URL)
    {
      throw new InternalServerErrorException('HubSpot configuration is missing');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.HUBSPOT_CLIENT_ID);
    params.append('client_secret', process.env.HUBSPOT_CLIENT_SECRET);
    params.append('redirect_uri', process.env.HUBSPOT_REDIRECT_URL);
    params.append('code', code);

    const response = await lastValueFrom(
      this.httpService.post(this.tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    const { access_token, refresh_token } = response.data;

    //start create custom group
    const groupConfigs: GroupConfig[] = [
      {
        objectType: 'contacts',
        name: `orderdata${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Order`,
        displayOrder: -1,
      },
      {
        objectType: 'contacts',
        name: `customerdata${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Customer`,
        displayOrder: -1,
      },
      {
        objectType: 'contacts',
        name: `abandonedcartdata${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned cart`,
        displayOrder: -1,
      },
      {
        objectType: 'contacts',
        name: `abandonedproductdata${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product`,
        displayOrder: -1,
      },
      {
        objectType: 'contacts',
        name: `productsandcategories${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Products & Categories`,
        displayOrder: -1,
      },
      {
        objectType: 'contacts',
        name: `lastproductbought${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Product Bought`,
        displayOrder: -1,
      },
      //deals
      {
        objectType: 'deals',
        name: `order${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Order`,
        displayOrder: -1,
      },
      {
        objectType: 'deals',
        name: `billingandshippingaddress${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing & Shipping Addresses`,
        displayOrder: -1,
      },
      {
        objectType: 'deals',
        name: `store${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Store`,
        displayOrder: -1,
      },
    ];

    groupConfigs.forEach(async cfg => await this.createCustomGroupName(access_token, cfg));
    //end create custom group

    //start create custom field
    const shopifyProps: (PropertyConfig & { objectType: string })[] = [
      // Products
      {
        objectType: 'products',
        name: 'id_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' ID',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'shop_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Shop',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'sku_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' SKU',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'chargetax_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Charge tax',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'quantity_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Quantity',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'vendor_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Vendor',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'barcode_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Barcode',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'tag_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Tag',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'isphysical_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Is physical',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      //updagrade
      {
        objectType: 'products',
        name: 'status_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Status',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'publish_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Publish',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'category_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Category',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'shoping_weight_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Shiping Weight',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'country_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Country',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'collection_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Collection',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'type_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Type',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      {
        objectType: 'products',
        name: 'hsc_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Harmonized System Code',
        type: 'string',
        fieldType: 'text',
        groupName: 'productinformation',
      },
      // Contacts
      {
        objectType: 'contacts',
        name: `categories_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Categories Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_categories_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Categories Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_product_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Product Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_product_types_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Product Types Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_html_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought HTML`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_skus_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last SKUs Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_total_number_of_products_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Total Number of Products Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_vendors_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Vendors Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `product_types_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Product Types Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `products_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Products Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shopify_product_tags_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shopify Product Tags`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `skus_bought_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} SKUs Bought`,
        type: 'string',
        fieldType: 'text',
        groupName: `productsandcategories${proPrifix?.toLowerCase()}`,
      },

      // Nhóm 2: lastproductbought${proPrifix?.toLowerCase()}
      {
        objectType: 'contacts',
        name: `last_products_bought_product_1_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 1 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_1_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 1 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_1_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 1 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_1_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 1 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_2_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 2 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_2_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 2 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_2_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 2 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_2_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 2 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_3_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 3 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_3_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 3 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_3_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 3 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `last_products_bought_product_3_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Last Products Bought Product 3 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `lastproductbought${proPrifix?.toLowerCase()}`,
      },
      //customer
      {
        objectType: 'contacts',
        name: `customer_group_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Customer Group`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shopping_cart_customer_id_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shopping Cart Customer ID`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shopping_cart_fields_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shopping Cart Fields`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_address_line_1_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Address Line 1`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_address_line_2_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Address Line 2`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_city_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing City`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_country_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Country`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_fax_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Fax`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_phone_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Phone`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_postal_code_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing Postal Code`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `billing_state_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Billing State`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_address_line_1_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Address Line 1`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_address_line_2_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Address Line 2`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_city_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping City`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_country_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Country`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_fax_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Fax`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_phone_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Phone`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_postal_code_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping Postal Code`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `shipping_state_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Shipping State`,
        type: 'string',
        fieldType: 'text',
        groupName: `customerdata${proPrifix?.toLowerCase()}`,
      },
      //endcustomer
      //abandon cart
      {
        objectType: 'contacts',
        name: `abandoned_cart_categories_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart Categories`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_cart_counter_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart Counter`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_cart_date_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart Date`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_cart_products_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart Products`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_cart_products_html_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart Products HTML`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_cart_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Cart URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `current_abandoned_cart_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Current Abandoned Cart`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `total_number_of_cart_products_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Total Number of Cart Products`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `total_value_of_abandoned_cart_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Total Value of Abandoned Cart`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedcartdata${proPrifix?.toLowerCase()}`,
      },
      //end abandon cart
      //abandon product
      {
        objectType: 'contacts',
        name: `abandoned_product_1_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 1 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_1_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 1 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_1_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 1 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_1_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 1 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      // Product 2
      {
        objectType: 'contacts',
        name: `abandoned_product_2_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 2 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_2_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 2 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_2_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 2 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_2_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 2 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      // Product 3
      {
        objectType: 'contacts',
        name: `abandoned_product_3_image_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 3 Image URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_3_name_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 3 Name`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_3_price_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 3 Price`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: `abandoned_product_3_url_${proPrifix?.toLowerCase()}`,
        label: `${prefix ? prefix + ' -' : ''} Abandoned Product 3 URL`,
        type: 'string',
        fieldType: 'text',
        groupName: `abandonedproductdata${proPrifix?.toLowerCase()}`,
      },
      //end abandon product

      {
        objectType: 'contacts',
        name: 'last_order_fulfillment_status_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Fulfillment Status',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_number_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Number',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_source_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Order Source',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_shipment_carrier_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Shipment Carrier',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_shipment_date_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Shipment Date',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_status_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Status',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_tracking_number_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Tracking Number',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'last_order_tracking_url_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Last Order Tracking URL',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      {
        objectType: 'contacts',
        name: 'unpaid_orders_count_' + (proPrifix?.toLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Unpaid Orders Count',
        type: 'string',
        fieldType: 'text',
        groupName: `orderdata${proPrifix?.toLowerCase()}`,
      },
      //custome group
      {
        objectType: 'contacts',
        name: 'id_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' ID',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
      {
        objectType: 'contacts',
        name: 'email_subscription_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Email Subscription',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
      {
        objectType: 'contacts',
        name: 'tag_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Tag',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
      {
        objectType: 'contacts',
        name: 'sms_subscription_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' SMS Subscription',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },
      {
        objectType: 'contacts',
        name: 'shop_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Shop',
        type: 'string',
        fieldType: 'text',
        groupName: 'contactinformation',
      },

      // Deals
      {
        objectType: 'deals',
        name: 'id_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' ID',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
      },
      {
        objectType: 'deals',
        name: 'payment_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Payment',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
      },
      {
        objectType: 'deals',
        name: 'shop_' + (proPrifix?.toLocaleLowerCase()),
        label: (prefix ? prefix + ' -' : '') + ' Shop',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
      },
      //deal enhance
      // Billing and Shipping Address Group
      {
        objectType: 'deals',
        name: 'billing_address_line_1_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing Address Line 1',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_address_line_2_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing Address Line 2',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_city_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing City',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_country_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing Country',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_phone_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing Phone',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_postal_code_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing Postal Code',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'billing_state_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Billing State',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_address_line_1_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping Address Line 1',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_address_line_2_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping Address Line 2',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_city_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping City',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_country_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping Country',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_phone_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping Phone',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_postal_code_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping Postal Code',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_state_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping State',
        type: 'string',
        fieldType: 'text',
        groupName: 'billingandshippingaddress' + proPrifix.toLowerCase()
      },
      // Order Group
      {
        objectType: 'deals',
        name: 'fulfillment_status_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Fulfillment Status',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_id_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Id',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_notes_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Notes',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_number_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Number',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_source_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Source',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_status_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Status',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_tags_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Tags',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_tracking_number_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Tracking Number',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'order_tracking_url_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Tracking Url',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'payment_title_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Payment Title',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipment_carrier_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipment Carrier',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipment_date_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipment Date',
        type: 'string',
        fieldType: 'text',
        groupName: 'order' + proPrifix.toLowerCase()
      },
      // Store Group
      {
        objectType: 'deals',
        name: 'order_values_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Order Values',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'discounts_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Discounts',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'gross_value_of_order_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Gross Value of Order',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'net_value_of_order_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Net Value of Order',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'refund_amount_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Refund amount',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'shipping_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Shipping',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      },
      {
        objectType: 'deals',
        name: 'tax_' + proPrifix.toLowerCase(),
        label: (prefix ? prefix + ' - ' : '') + 'Tax',
        type: 'string',
        fieldType: 'text',
        groupName: 'store' + proPrifix.toLowerCase()
      }
    ];

    shopifyProps.forEach(async cfg => await this.createCustomProperty(access_token, cfg));
    //end create custom field
    const detailResponse = await lastValueFrom(
      this.httpService.get('https://api.hubapi.com/account-info/v3/details', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
        },
      }),
    );

    const { portalId, accountType } = detailResponse.data;

    const usersResponse = await lastValueFrom(
      this.httpService.get(
        'https://api.hubapi.com/crm/v3/objects/users?properties=hs_email,hs_main_phone,hs_given_name,hs_family_name',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json',
          },
        },
      ),
    );

    const user = usersResponse.data.results[0];
    const email = user.properties.hs_email;
    const fullName = `${user.properties.hs_given_name} ${user.properties.hs_family_name}`;


    const platform = await this.platformModel.findOne({ name: 'Hubspot' });
    if (!platform)
    {
      throw new NotFoundException(`Platform with name Hubspot not found`);
    }

    const existingApp = await this.appModel.findOne({
      user: user_id,
      'credentials.portalId': portalId,
      isDeleted: false
    });


    if (existingApp)
    {
      console.log(`Đã tìm thấy App tồn tại với user=${user_id} và portalId=${portalId}, tiến hành UPDATE.`);

      if (existingApp.credentials.prefix !== prefix)
      {
        console.log('ko giong')
        const listConnect = await this.connectModel.find({
          user: user_id,
          to: existingApp.id
        }).exec();

        // console.log("check listConnect: ", listConnect);
        if (listConnect.length > 0)
        {
          console.log("check listConnect: ", listConnect)
          const updatePromises = listConnect.map(async conn => {
            await this.connectModel.findByIdAndUpdate(
              conn._id,
              { syncMetafield: false },
            ).exec()
            console.log("conn.id: ", conn.id)
            const allField = await this.fieldModel.deleteMany({
              connect: conn.id,
              user: user_id
            });

            console.log("check allField: ", allField)
          }
          );
          await Promise.all(updatePromises);
        }
      }



      existingApp.credentials = {
        portalId,
        accountType,
        refresh_token,
        access_token,
        email,
        fullName,
        prefix
      };



      await existingApp.save();
      return existingApp;
    } else
    {
      console.log(`Không tìm thấy App với user=${user_id} và portalId=${portalId}, tiến hành CREATE mới.`);

      const createdApp = new this.appModel({
        platform: platform._id,
        name: `Hubspot[${portalId}]`,
        user: user_id,
        credentials: { portalId, accountType, refresh_token, access_token, email, fullName, prefix },
      });

      const pointApp = await createdApp.save();
      const listModule = await this.commonApplicationService.createModuleForApp(pointApp._id, platform._id);
      pointApp.ModuleApp = listModule;

      return pointApp.save();
    }
  }


  async createCustomProperty(
    token: string,
    config: PropertyConfig
  ): Promise<{ status: number; msg: string }> {
    const propertyUrl = `https://api.hubapi.com/crm/v3/properties/${config.objectType}`;
    const { objectType, ...body } = config;

    try
    {
      await this.delay(500);
      const axiosResponse = await lastValueFrom(
        this.httpService.post(propertyUrl, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );
      return {
        status: axiosResponse.status,
        msg: 'Property created successfully',
      };
    } catch (err: any)
    {
      if (err.response)
      {
        const status = err.response.status;
        const data = err.response.data;
        return {
          status,
          msg: data.message || JSON.stringify(data),
        };
      }
      return {
        status: 503,
        msg: `Network error: ${err.message}`,
      };
    }
  }

  async createCustomGroupName(
    token: string,
    config: GroupConfig
  ): Promise<{ status: number; msg: string }> {
    const groupUrl = `https://api.hubapi.com/crm/v3/properties/${config.objectType}/groups`;
    const { objectType, ...body } = config; // Exclude objectType from the body

    try
    {
      const axiosResponse = await lastValueFrom(
        this.httpService.post(groupUrl, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );
      return {
        status: axiosResponse.status,
        msg: 'Group created successfully',
      };
    } catch (err: any)
    {
      if (err.response)
      {
        const status = err.response.status;
        const data = err.response.data;
        return {
          status,
          msg: data.message || JSON.stringify(data),
        };
      }
      return {
        status: 503,
        msg: `Network error: ${err.message}`,
      };
    }
  }

  async validateHubspotToken(app_id: string): Promise<void> {
    const token = await this.hubspotCredentialService.getToken(app_id);
    console.log("check token: ", token)
    if (!token)
    {
      throw new BadRequestException('HubSpot token not found for this app_id');
    }

    const checkUrl = `${this.tokenInfoUrl}`;

    try
    {
      const response = await lastValueFrom(
        this.httpService.get(checkUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
      );

      console.log("check response: ", response)

      if (response.status !== 200)
      {
        throw new UnauthorizedException('HubSpot token is invalid or expired');
      }
    } catch (err: any)
    {
      if (err.response && (err.response.status === 401 || err.response.status === 403))
      {
        throw new UnauthorizedException('HubSpot token is invalid or expired');
      }
      throw new UnauthorizedException(
        `Error checking HubSpot token`,
      );
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
