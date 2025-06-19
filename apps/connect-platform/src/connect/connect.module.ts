import { Module } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { ConnectController } from './connect.controller';
import { ConnectWebhookService } from './connect-webhook.service';
import { HttpModule } from '@nestjs/axios';
import { ApplicationModule } from '../application/application.module';
import { HubspotModule } from 'apps/hubspot/src/hubspot.module';

@Module({
  imports: [HttpModule, ApplicationModule],
  controllers: [ConnectController],
  providers: [ConnectService, ConnectWebhookService],
})
export class ConnectModule { }
