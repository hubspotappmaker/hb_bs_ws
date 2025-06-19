import { Controller, Get } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller()
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get()
  getHello(): string {
    return this.shopifyService.getHello();
  }
}
