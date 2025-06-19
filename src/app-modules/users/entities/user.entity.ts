import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";

@Entity("user")
export class UserEntity extends BaseEntity {
	@Column()
	name: string;

	@Column()
	email: string;

	@Column()
	password: string;
}
