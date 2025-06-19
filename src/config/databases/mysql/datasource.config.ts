import { DataSource, DataSourceOptions } from "typeorm";
import { SeederOptions } from "typeorm-extension";

import * as dotenv from "dotenv";

dotenv.config();

const datasourceConfig: DataSourceOptions & SeederOptions = {
	migrationsTableName: "migrations",
	type: "mysql",
	host: process.env.MYSQL_HOST,
	port: +process.env.MYSQL_PORT,
	username: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	logging: false,
	entities: ["dist/**/*.entity.{js,ts}"],
	migrations: ["dist/databases/migrations/*.{js,ts}"],
	seeds: ["dist/databases/seeders/seeds/*.seed.js"],
	factories: ["dist/databases/factories/*.factory.js"],
	charset: "utf8mb4_unicode_ci",
};

export const AppDatasource = new DataSource(datasourceConfig);
