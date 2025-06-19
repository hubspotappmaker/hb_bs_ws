import { Module } from "@nestjs/common";
import { WinstonCustomLogger } from "./winston.logger.service";

@Module({
	controllers: [],
	providers: [WinstonCustomLogger],
	exports: [WinstonCustomLogger],
})
export class WinstonLoggerCustomModule {}
