import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CORS_OPTIONS } from '@app/common';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prefix = process.env.CF_PREFIX || "";

  const swaggerOptions = {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    deepLinking: true,
    displayRequestDuration: true,
    defaultModelExpandDepth: 100,
    defaultModelsExpandDepth: 100,
    tryItOutEnabled: false,
    syntaxHighlight: {
      theme: 'monokai',
    },
  };
  const swaggerDescription = `The API description.<br/> <br/>
    ========================================================<br/>
    Some useful links:
    <li>[Swagger UI](/docs)</li>
    <li>[Postman Collection](/docs-json)</li>
    <li>[Category Document](/docs/category)</li>
    `;
  const documentCfg = new DocumentBuilder()
      .setTitle('Hubspot API')
      .setDescription(swaggerDescription)
      .setVersion('1.0')
      .addBearerAuth()
      .build();

  const document = SwaggerModule.createDocument(app, documentCfg, {
    ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup('docs', app, document, { swaggerOptions });

  const corsOptions = app.get<CorsOptions>(CORS_OPTIONS);
  app.enableCors(corsOptions);
  app.setGlobalPrefix(prefix)
  ;
  await app.listen(8080);
}
bootstrap();
