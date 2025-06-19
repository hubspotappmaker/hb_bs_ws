import { CommonPaginatorInterface } from "../interfaces/common-paginator.interface";
import { ApiResponseProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class CommonPaginationSerializer<T> implements CommonPaginatorInterface {
	@ApiResponseProperty()
	@Transform(({ value }) => parseInt(value))
	total: number;

	@ApiResponseProperty()
	@Transform(({ value }) => parseInt(value))
	totalPage: number;

	@ApiResponseProperty()
	@Transform(({ value }) => parseInt(value))
	page: number;

	@ApiResponseProperty()
	@Transform(({ value }) => parseInt(value))
	nextPage: number;

	@ApiResponseProperty()
	meta_data: T;
}
