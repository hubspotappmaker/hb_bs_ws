import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class GoogleLoginDto {
    @ApiProperty({ description: 'Access token từ Google OAuth' })
    @IsString()
    access_token: string;

    @ApiProperty({ description: 'Refresh token từ Google OAuth', required: false })
    @IsOptional()
    @IsString()
    refresh_token?: string;
}
