import { IsString, IsNotEmpty, IsMongoId, ValidateNested, IsObject, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CredentialsDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false }) 
  shopUrl: string;

  @IsString()
  @IsNotEmpty()
  shopName: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

}

export class ConnectShopifyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials: CredentialsDto;
}
