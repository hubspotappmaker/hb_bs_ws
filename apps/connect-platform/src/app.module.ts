import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from '@app/common';
import { AuthModule } from 'apps/auth/src/auth.module';
import { PlatformModule } from './platform/platform.module';
import { ApplicationModule } from './application/application.module';
import { ConnectModule } from './connect/connect.module';
import { MigrateModule } from './migrate/migrate.module';
import { MetafieldModule } from './metafield/metafield.module';
import { LogModule } from './log/log.module';
import { StreamModule } from './stream/stream.module';

@Module({
  imports: [CommonModule.forRoot(), AuthModule, PlatformModule, ApplicationModule, ConnectModule, MigrateModule, MetafieldModule, LogModule, StreamModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
