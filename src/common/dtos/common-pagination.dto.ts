import { CommonPaginationInterface } from "../interfaces/common-pagination.interface";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, Min, ValidateIf } from "class-validator";
import { isInteger } from "lodash";
import { Transform } from "class-transformer";
import { stringToBoolean } from "../functions/string-to-boolean";

export class CommonPaginationDto implements CommonPaginationInterface {
	@ApiPropertyOptional({
		default: 15,
	})
	@IsOptional()
	@IsNumber()
	@ValidateIf(o => isInteger(o.limit))
	@Min(0)
	limit?: number;

	@ApiPropertyOptional({
		default: 1,
	})
	@IsOptional()
	@IsNumber()
	@ValidateIf(o => isInteger(o.page))
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		default: false,
	})
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => stringToBoolean(value))
	getAll?: boolean;
}
