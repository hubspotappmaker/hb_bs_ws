import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { Request } from 'express';
import { CreateConnectDto, UpdateConnectDto } from '@app/common/interface/dto/common/connect.dto';
import { ParseObjectIdPipe } from '@nestjs/mongoose';

@Controller('connect')
export class ConnectController {
  constructor(private readonly connectService: ConnectService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('get-all')

  async getAllApplication(
    @Query() paginationDto: PaginationDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.connectService.getAllApplication(paginationDto, user?.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('get-by-id/:id')
  async getDetailApplication(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.connectService.getDetailConnect(id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Post('create')
  async createNewConnect(
    @Req() req: Request,
    @Body() dto: CreateConnectDto
  ) {
    const user = req['user'] as any;
    return this.connectService.createNewConnect(dto, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Delete('delete/:id')
  async softDeleteConnect(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;

    return this.connectService.softDelete(id, user.sub);
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Patch('disable/:id')
  async disableConnect(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;

    return this.connectService.disableConnect(id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Patch('enable/:id')
  async enableConnect(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;

    return this.connectService.enableConnect(id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Patch('update')
  async updateNameConnect(
    @Body() dto: UpdateConnectDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;

    return this.connectService.updateConnectName(user.sub, dto);
  }
}
