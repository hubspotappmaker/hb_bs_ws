import { forwardRef, Module } from '@nestjs/common';
import { HubspotCredentialService } from './hubspot.credential.service';
import { CommonModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { HubspotSyncService } from './shopify/hubspot.sync.service';
import { HubspotMigrateService } from './shopify/hubspot.migrate.service';
import { HubspotMetafieldService } from './metafield/hubspot.metafield.service';
import { ShopifyModule } from 'apps/shopify/src/shopify.module';
import { HubspotOrtherDataService } from './shopify/hubspot.additional.service';

@Module({
  imports: [CommonModule.forRoot(), HttpModule, forwardRef(() => ShopifyModule)],
  providers: [HubspotCredentialService, HubspotSyncService, HubspotMigrateService, HubspotMetafieldService, HubspotOrtherDataService],
  exports: [HubspotCredentialService, HubspotSyncService, HubspotMigrateService, HubspotMetafieldService, HubspotOrtherDataService]
})
export class HubspotModule { }
