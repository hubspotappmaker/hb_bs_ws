import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PlatformType } from '../../enum/platform.enum';


export class CreatePlatformDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  baseUrl: string;

  @IsEnum(PlatformType)
  type: PlatformType;

}
