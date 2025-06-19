import { Module, DynamicModule, Global, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { CommonService } from './common.service';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
import { App, AppSchema } from './schemas/app.schema';
import { ModuleApp, ModuleSchema } from './schemas/module.schema';
import { Platform, PlatformSchema } from './schemas/platform.schema';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ResponseInterceptor } from './configuration/interceptor/response.interceptor';
import { AllExceptionsFilter } from './configuration/filter/error.filter';
import { Field, FieldSchema } from './schemas/field.schema';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Connect, ConnectSchema } from './schemas/connect.schema';
import { Tier, TierSchema } from './schemas/tier.schema';
import { Log, LogSchema } from './schemas/log.schema';
import { LogDataService } from './util/log/log.data.service';
// Define a token for CORS options
export const CORS_OPTIONS = 'CORS_OPTIONS';

@Global()
@Module({})
export class CommonModule {
  static forRoot(): DynamicModule {
    return {
      module: CommonModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (config: ConfigService): Promise<MongooseModuleOptions> => ({
            uri: config.get<string>('MONGO_URL'),
            autoCreate: true,
            autoIndex: true,
            connectionFactory: (connection) => {
              connection.plugin(softDeletePlugin, { overrideMethods: true });
              return connection;
            },
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([
          { name: Platform.name, schema: PlatformSchema },
          { name: App.name, schema: AppSchema },
          { name: Field.name, schema: FieldSchema },
          { name: ModuleApp.name, schema: ModuleSchema },
          { name: User.name, schema: UserSchema },
          { name: Connect.name, schema: ConnectSchema },
          { name: Tier.name, schema: TierSchema },
          { name: Log.name, schema: LogSchema },
        ]),
      ],
      providers: [
        LogDataService,
        CommonService,
        {
          provide: APP_PIPE,
          useFactory: () =>
            new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
            }),
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: AllExceptionsFilter,
        },
        // {
        //   provide: CORS_OPTIONS,
        //   useFactory: (configService: ConfigService): CorsOptions => ({
        //     origin: configService.get<string>('CORS_ORIGIN'),
        //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        //     credentials: true,
        //   }),
        //   inject: [ConfigService],
        // },
        {
          provide: CORS_OPTIONS,
          useFactory: (configService: ConfigService): CorsOptions => ({
            origin: "*",
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: true,
          }),
          inject: [ConfigService],
        },
      ],
      exports: [
        CommonService,
        MongooseModule,
        LogDataService
      ],
    };
  }
}