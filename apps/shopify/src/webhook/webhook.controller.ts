import { Body, Controller, Param, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) { }

  @Post('customer/:shopifyId/:hubspotId/:connectId')
  async syncDataCustomer(
    @Param('shopifyId') shopifyId: string,
    @Param('hubspotId') hubspotId: string,
    @Param('connectId') connectId: string,
    @Body() data: any
  ) {
    return this.webhookService.syncDataCustomer(data, shopifyId, hubspotId, connectId);
  }

  @Post('product/:shopifyId/:hubspotId/:connectId')
  async syncDataProduct(
    @Param('shopifyId') shopifyId: string,
    @Param('hubspotId') hubspotId: string,
    @Param('connectId') connectId: string,
    @Body() data: any
  ) {
    return this.webhookService.syncDataProduct(data, shopifyId, hubspotId, connectId);
  }

  @Post('order/:shopifyId/:hubspotId/:connectId')
  async syncDataOrder(
    @Param('shopifyId') shopifyId: string,
    @Param('hubspotId') hubspotId: string,
    @Param('connectId') connectId: string,
    @Body() data: any
  ) {
    console.log("LASN__________>>>>>>>")
    this.webhookService.syncDataOrder(data, shopifyId, hubspotId, connectId);
  }
}