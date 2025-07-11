import { App } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { FormatCustomField } from '@app/common/interface/type/field.type';
import { ShopifyModuleName } from '@app/common/interface/enum/shopify/shopify.enum';

@Injectable()
export class ShopifyMetafieldService {
  constructor(
    @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
    private readonly httpService: HttpService,
  ) { }


  async getAllCustomField(shopify_id: string, shopifyModuleName: ShopifyModuleName): Promise<FormatCustomField[]> {
    const app = await this.appModel.findOne({ _id: shopify_id });
    if (!app) throw new Error('App not found');
    const { shopUrl, accessToken } = app.credentials;

    const query = `
      query {
        metafieldDefinitions(first: 250, ownerType: ${shopifyModuleName.toUpperCase()}) {
          edges {
            node {
              id
              namespace
              name
              key
              type {
                name
              }
              description
            }
          }
        }
      }
    `;

    const response = await this.httpService.post(
      `${shopUrl}/admin/api/2025-04/graphql.json`,
      { query },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    ).toPromise();

    const metafieldDefinitions = response?.data.data.metafieldDefinitions.edges;

    const customFields: FormatCustomField[] = metafieldDefinitions.map(edge => ({
      name: edge.node.key,
      label: edge.node.name,
      description: edge.node.description || '',
    }));

    return customFields;
  }

}


