import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { BaseEntityInterface, WithDateInterface } from "../interfaces/base-entity.interface";

export class WithDate implements WithDateInterface {
	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@DeleteDateColumn()
	deletedAt: Date;
}

export class BaseEntity extends WithDate implements BaseEntityInterface {
	@PrimaryGeneratedColumn("uuid")
	id: string;
}
