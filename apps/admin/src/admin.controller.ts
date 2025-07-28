import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GoogleDriveCredentialDto } from '@app/common/interface/dto/application/application.filter.sto';

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

}
