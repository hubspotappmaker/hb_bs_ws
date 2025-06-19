import { forwardRef, Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { HubspotModule } from 'apps/hubspot/src/hubspot.module';
import { DatafieldService } from '../metafield/datafield.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [forwardRef(() => HubspotModule), HttpModule],
  controllers: [WebhookController],
  providers: [WebhookService, DatafieldService],
  exports: [DatafieldService]
})
export class WebhookModule { }
