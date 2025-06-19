export interface BaseEntityInterface extends WithDateInterface {
	id: string;
}

export interface WithDateInterface {
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date;
}
