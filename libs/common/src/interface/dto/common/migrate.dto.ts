import { IsOptional, IsISO8601, IsEnum } from 'class-validator';
import { ModuleSync } from '../../enum/platform.enum';

export class StartMigrateHubspotDto {
    @IsOptional()
    @IsISO8601()
    sync_from?: string;

    @IsOptional()
    @IsISO8601()
    sync_to?: string;

    @IsEnum(ModuleSync)
    moduleSync: ModuleSync;
}
