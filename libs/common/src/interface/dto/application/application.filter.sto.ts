import {IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length} from "class-validator";
import { PlatformType } from "../../enum/platform.enum";
import { PaginationDto } from "../common/pagination.dto";
import {ApiProperty} from "@nestjs/swagger";

export class ApplicationFilterDto extends PaginationDto {
    @IsOptional()
    @IsEnum(PlatformType)
    platform?: PlatformType;

}

export class UpdateAppDto {
    @IsMongoId({ message: 'from must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'from is required.' })
    id: string;

    @IsString()
    @IsNotEmpty()
    @Length(5, 30)
    name: string;
}

class TokenDto {
    @ApiProperty()
    @IsString()
    access_token: string;

    @ApiProperty()
    @IsString()
    refresh_token: string;

    @ApiProperty()
    @IsNumber()
    expires_in: number;

    @ApiProperty()
    @IsString()
    token_type: string;

    @ApiProperty()
    @IsNumber()
    timestamp: number;
}

export class GoogleDriveCredentialDto {

    @ApiProperty()
    @IsString()
     hub_id: string;

    @ApiProperty()
    @IsString()
     email: string;

    @ApiProperty()
    @IsString()
     installed_date: string;

    @ApiProperty({
        type:TokenDto
    })
    @IsOptional()
    token?: TokenDto
}


