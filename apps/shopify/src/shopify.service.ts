import { Injectable } from '@nestjs/common';

@Injectable()
export class ShopifyService {
  getHello(): string {
    return 'Hello World! shopify';
  }
}
