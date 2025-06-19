import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../../common/entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { SettingTokenEntity } from "../../common/entities/setting-token.entity";
import { Settings } from "../../common/entities/setting.entity";

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, SettingTokenEntity, Settings])],
	providers: [UserService],
	exports: [TypeOrmModule, UserService],
	controllers: [UserController],
})
export class UserModule {}
