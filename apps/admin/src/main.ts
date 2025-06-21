import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CORS_OPTIONS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  const prefix = process.env.ADMIN_PREFIX || "";

  console.log(prefix)
  const corsOptions = app.get<CorsOptions>(CORS_OPTIONS);
  app.setGlobalPrefix(prefix);
  app.enableCors(corsOptions);
  await app.listen(8084, async () => {
    console.log("Server is listening on: " + 8084);
  });
}
bootstrap();
