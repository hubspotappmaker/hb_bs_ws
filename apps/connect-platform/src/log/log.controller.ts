import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { LogService } from './log.service';
import { FilterLogDto } from '@app/common/interface/dto/log/log.filter.dto';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { Request } from 'express';

@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('get-all')
  async getAllLog(
    @Query() filterLogDto: FilterLogDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.logService.getAll(filterLogDto, user.sub)
  }
}
