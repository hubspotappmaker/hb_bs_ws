import { Module } from '@nestjs/common';
import { ShopifyApplicationService } from './shopify-application.service';
import { ApplicationController } from './application.controller';
import { HubspotApplicationService } from './hubspot-application.service';
import { HttpModule } from '@nestjs/axios';
import { CommonApplicationService } from './common-application.service';
import { HubspotModule } from 'apps/hubspot/src/hubspot.module';
import { JwtModule } from '@nestjs/jwt';
import {GoogleDriverApplicationService} from "./google-driver-application.service";
@Module({
  imports: [
    HttpModule,
    HubspotModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRED_TIME },
    }),
  ],
  controllers: [ApplicationController],
  providers: [ShopifyApplicationService, HubspotApplicationService, CommonApplicationService,GoogleDriverApplicationService],
  exports: [HubspotApplicationService, ShopifyApplicationService]
})
export class ApplicationModule { }
