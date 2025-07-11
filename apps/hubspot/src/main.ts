import { NestFactory } from '@nestjs/core';
import { HubspotModule } from './hubspot.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CORS_OPTIONS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(HubspotModule);
  const prefix = process.env.HUBSPOT_PREFIX || "";
  const corsOptions = app.get<CorsOptions>(CORS_OPTIONS);
  app.enableCors(corsOptions);
  app.setGlobalPrefix(prefix);

  await app.listen(8083);
}
bootstrap();
