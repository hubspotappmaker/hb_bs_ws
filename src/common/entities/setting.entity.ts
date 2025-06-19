import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { UserEntity } from "./user.entity";
import { SettingTokenEntity } from "./setting-token.entity";

@Entity("settings")
export class Settings {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	user_id: string;

	@ManyToOne(() => UserEntity, user => user.settings, { onDelete: "CASCADE" })
	@JoinColumn({ name: "user_id" })
	user: UserEntity;

	@Column({ nullable: true })
	root_folder: string;

	@OneToOne(() => SettingTokenEntity, token => token.settings)
	token: SettingTokenEntity;
}
