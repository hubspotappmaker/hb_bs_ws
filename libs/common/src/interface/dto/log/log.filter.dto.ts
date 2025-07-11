import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { CommonModuleName } from '../../enum/module.enum';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto';

export class FilterLogDto extends PaginationDto {

    @IsOptional()
    @IsEnum(CommonModuleName)
    module?: CommonModuleName;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    status?: boolean;
}
