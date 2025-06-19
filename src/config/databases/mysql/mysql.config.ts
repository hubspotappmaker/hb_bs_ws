import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { NodeEnv } from "../../../common/constants/node-env";
import * as dotenv from "dotenv";

dotenv.config();

const mysqlConfigOptions: TypeOrmModuleOptions = {
	type: "mysql",
	host: process.env.MYSQL_HOST,
	port: +process.env.MYSQL_PORT,
	username: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	autoLoadEntities: true,
	synchronize: true,
	charset: "utf8mb4",
	logging: process.env.NODE_ENV === NodeEnv.LOCAL,
	entities: ["dist/**/*.entity.{js,ts}"],
	// useUTC: true,
};

export default mysqlConfigOptions;
