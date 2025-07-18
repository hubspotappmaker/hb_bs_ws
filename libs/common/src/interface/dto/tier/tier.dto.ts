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

    @IsNumber()
    orderSyncLimit: number;

    @IsNumber()
    productSyncLimit: number;

    @IsNumber()
    customerSyncLimit: number;

    @IsNumber()
    metafieldLimit: number;
}

export class UpdateTierDto extends PartialType(CreateTierDto) {
    @IsOptional()
    @IsBoolean()
    isActive: boolean
}
