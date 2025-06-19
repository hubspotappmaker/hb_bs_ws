import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Get('me')
  getHello(@Req() req: Request) {
    const user = req['user'] as any;
    return this.appService.getUserInfo(user.sub);
  }
}
