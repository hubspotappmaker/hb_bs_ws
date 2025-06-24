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
    @IsOptional()
    access_token: string;

    @ApiProperty()
    @IsOptional()
    refresh_token: string;

    @ApiProperty()
    @IsOptional()
    expires_in: number;

    @ApiProperty()
    @IsOptional()
    token_type: string;

    @ApiProperty()
    @IsOptional()
    folder_id: number;

    @ApiProperty()
    @IsOptional()
    prefix:any;

    @ApiProperty()
    @IsOptional()
    full_name:any;

}

export class GoogleDriveCredentialDto {

    @ApiProperty()
    @IsString()
    platform_name:string

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

    @ApiProperty()
    @IsOptional()
    app_id: string

    @ApiProperty()
    @IsOptional()
    folder_id: string


}


