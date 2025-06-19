import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { initializeTransactionalContext } from "typeorm-transactional";
import { NestExpressApplication } from "@nestjs/platform-express";
import "reflect-metadata";
import * as morgan from "morgan";
import { ValidationPipe, VERSION_NEUTRAL, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
	initializeTransactionalContext();

	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		abortOnError: true,
	});

	//Global config
	app.setGlobalPrefix("api");
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: VERSION_NEUTRAL,
	});
	app.useStaticAssets("public", {
		prefix: "/public",
	});

	app.enableCors();

	//pipes
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			// transform: true,
			// forbidUnknownValues: true,
			// validationError: { target: false },
		}),
	);

	//interceptors

	morgan.token("body", function (req) {
		if (!req.originalUrl.includes("/login")) {
			return JSON.stringify(req.body);
		}
		return "{}";
	});
	app.use(
		morgan(
			':remote-addr :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" data::body :response-time ms',
		),
	);

	//Swagger Api
	if (process.env.NODE_ENV !== "prod") {
		const options = new DocumentBuilder()
			.setTitle(" Backend Service")
			.setDescription(" API description")
			.setVersion("1.0")
			.addBearerAuth()
			.build();

		const document = SwaggerModule.createDocument(app, options);
		SwaggerModule.setup("/docs", app, document);
	}

	const port = process.env.SERVER_PORT || 3000;
	await app.listen(port, async () => {
		console.log("Server is listening on: " + (await app.getUrl()));
	});
}
bootstrap();
