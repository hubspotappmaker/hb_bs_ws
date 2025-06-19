import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base-entity";
import { Settings } from "./setting.entity";

@Entity("user")
export class UserEntity extends BaseEntity {
	@Column()
	name: string;

	@Column()
	password: string;

	@Column()
	hub_id: string;

	@Column({ unique: true })
	email: string;

	@OneToMany(() => Settings, settings => settings.user)
	settings: Settings[];
}
