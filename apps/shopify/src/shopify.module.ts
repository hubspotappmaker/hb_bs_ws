import { Module } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { CommonModule } from '@app/common';
import { WebhookModule } from './webhook/webhook.module';
import { ShopifyMetafieldService } from './metafield/shopify.metafield.service';
import { HttpModule } from '@nestjs/axios';
import { DatafieldService } from './metafield/datafield.service';

@Module({
  imports: [CommonModule.forRoot(), WebhookModule, HttpModule],
  controllers: [ShopifyController],
  providers: [ShopifyService, ShopifyMetafieldService, DatafieldService],
  exports: [ShopifyService, ShopifyMetafieldService, DatafieldService]
})
export class ShopifyModule { }
