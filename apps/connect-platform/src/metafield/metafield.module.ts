import { Module } from '@nestjs/common';
import { MetafieldService } from './metafield.service';
import { MetafieldController } from './metafield.controller';
import { HubspotModule } from 'apps/hubspot/src/hubspot.module';
import { ShopifyModule } from 'apps/shopify/src/shopify.module';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [HubspotModule, ShopifyModule, ApplicationModule],
  controllers: [MetafieldController],
  providers: [MetafieldService],
})
export class MetafieldModule { }
