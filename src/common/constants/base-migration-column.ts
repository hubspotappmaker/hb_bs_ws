import { TableColumnOptions } from "typeorm";

const baseMigrationColumn: TableColumnOptions[] = [
	{
		name: "id",
		type: "varchar",
		isPrimary: true,
		generationStrategy: "uuid",
	},
	{
		name: "createdAt",
		type: "timestamp(6)",
		default: "current_timestamp(6)",
	},
	{
		name: "updatedAt",
		type: "timestamp(6)",
		onUpdate: "current_timestamp(6)",
	},
	{
		name: "deletedAt",
		type: "timestamp(6)",
		isNullable: true,
	},
];
export default baseMigrationColumn;
