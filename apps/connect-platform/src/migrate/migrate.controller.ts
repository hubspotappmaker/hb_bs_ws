import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MigrateService } from './migrate.service';
import { StartMigrateHubspotDto } from '@app/common/interface/dto/common/migrate.dto';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { Request } from 'express';

@Controller('migrate')
export class MigrateController {
  constructor(private readonly migrateService: MigrateService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Post('start/:connectId')
  async startSyncData(
    @Req() req: Request,
    @Param('connectId') connectId: string,
    @Body() dto: StartMigrateHubspotDto,
  ) {
    const user = req['user'] as any;
    return this.migrateService.startSyncData(dto, connectId, user.sub)
  }
}
