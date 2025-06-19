import { Module } from '@nestjs/common';
import { MigrateService } from './migrate.service';
import { MigrateController } from './migrate.controller';
import { HubspotModule } from 'apps/hubspot/src/hubspot.module';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [HubspotModule, ApplicationModule],
  controllers: [MigrateController],
  providers: [MigrateService],
})
export class MigrateModule { }
