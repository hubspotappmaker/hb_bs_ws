import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Settings } from "./setting.entity";

@Entity("setting-token")
export class SettingTokenEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	setting_id: string;

	@OneToOne(() => Settings, settings => settings.token, { onDelete: "CASCADE" })
	@JoinColumn({ name: "setting_id" })
	settings: Settings;

	@Column({ type: "text", nullable: true })
	access_token: string;

	@Column({ type: "text", nullable: true })
	refresh_token: string;

	@Column({ type: "datetime", nullable: true })
	expiry: Date;

	@Column({ nullable: true })
	scope: string;

	@Column({ nullable: true })
	token_type: string;
}
