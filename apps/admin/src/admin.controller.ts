import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GoogleDriveCredentialDto } from '@app/common/interface/dto/application/application.filter.sto';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { Role } from '@app/common/interface/enum/user.enum';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get()
  getHello(): string {
    return this.adminService.getHello();
  }

  @Post('queue-source')
  async createQueueSource(
    @Body() queue: GoogleDriveCredentialDto
  ) {
    return this.adminService.createQueueApp(queue);
  }

  @Get('log-action-upload/:id')
  async logActionUpload(
    @Param("id") id: string
  ) {
    return this.adminService.logActionUpload(id);
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('logs/count/user/:userId')
  async countLogsByUser(@Param('userId') userId: string) {
    const count = await this.adminService.countLogsByUser(userId);
    return count;
  }

  @Get('logs/count/app/:appId')
  async countLogsByApp(@Param('appId') appId: string) {
    const count = await this.adminService.countLogsByApp(appId);
    return count;
  }


}
