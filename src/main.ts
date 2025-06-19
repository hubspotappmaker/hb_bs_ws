import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CORS_OPTIONS } from '@app/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  const prefix = process.env.ADMIN_PREFIX || "";

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
  app.setGlobalPrefix(prefix);
  app.enableCors(corsOptions);
  console.log('app running on port: 8084')
  await app.listen(8084);
  console.log('app running on port: 8084')
}
bootstrap();
