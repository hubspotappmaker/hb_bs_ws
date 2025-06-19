import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import mysqlConfig from "../../config/databases/mysql/mysql.config";
import { addTransactionalDataSource } from "typeorm-transactional";
import { DataSource } from "typeorm";

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			useFactory() {
				return mysqlConfig;
			},
			async dataSourceFactory(options) {
				if (!options) {
					throw new Error("Invalid options passed");
				}

				return addTransactionalDataSource(new DataSource(options));
			},
		}),
	],
})
export class DatabaseProviderModule {}
