import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseProviderModule } from "./providers/databases/provider.module";
import { WinstonLoggerCustomModule } from "./common/modules/winston/winston.logger.module";
import { UserModule } from "./app-modules/users/user.module";

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseProviderModule,
		ThrottlerModule.forRoot({
			ttl: 60,
			limit: 10,
		}),
		WinstonLoggerCustomModule,
		UserModule,
	],
})
export class AppModule {}
