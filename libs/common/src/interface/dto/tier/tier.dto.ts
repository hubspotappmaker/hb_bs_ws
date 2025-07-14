import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Optional } from '@nestjs/common';


export class CreateTierDto {
    @IsString()
    name: string;

    @IsNumber()
    connectLimit: number;

    @IsNumber()
    appLimit: number;
}

export class UpdateTierDto extends PartialType(CreateTierDto) {
    @IsOptional()
    @IsBoolean()
    isActive: boolean
}
