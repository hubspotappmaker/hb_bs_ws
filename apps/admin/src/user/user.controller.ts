import { Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get("get-all")
  async getAllUser(
    @Query() paginationDto: PaginationDto
  ) {
    return this.userService.getAllUser(paginationDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put('change-status/:id')
  async changeStatus(
    @Param('id') id: string,
    @Query('status') status: boolean,
  ) {
    return this.userService.changeStatus(id, status);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put('change-tier/:id')
  async changeTier(
    @Param('id') id: string,
    @Query('tierID') tierID: string,
  ) {
    return this.userService.changeTier(id, tierID);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get("get-source")
  async getSourceUser(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.userService.getSourceUser(paginationDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get("get-queue-source")
  async getQueueSourceUser(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.userService.getQueueUser(paginationDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete('delete-account/:id')
  async deleteAccount(
    @Param('id') id: string,
  ) {
    return this.userService.deleteAccount(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('change-expired-status/:id/:status')
  async changeExpiredStatus(
    @Param('id') id: string,
    @Param('status') status: boolean,
  ) {
    return this.userService.deleteAccount(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('set-expired-date/:id/:date')
  async setExpiredDate(
    @Param('id') id: string,
    @Param('date') date: Date,
  ) {
    return this.userService.setExpiredDate(id, date);
  }


  @Get('check-expired/:id')
  async checkExpired(
    @Param('id') id: string,
  ) {
    return this.userService.checkExpired(id);
  }
}
