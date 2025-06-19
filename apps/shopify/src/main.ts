import { NestFactory } from '@nestjs/core';
import { ShopifyModule } from './shopify.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CORS_OPTIONS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(ShopifyModule);
  const prefix = process.env.SHOPIFY_PREFIX || "";
  const corsOptions = app.get<CorsOptions>(CORS_OPTIONS);
  app.enableCors(corsOptions);
  app.setGlobalPrefix(prefix);

  await app.listen(8082);
}
bootstrap();
