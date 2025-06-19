import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { MetafieldService } from './metafield.service';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { Request } from 'express';
import { CommonModuleName } from '@app/common/interface/enum/module.enum';
import { AssociateFieldDto } from '@app/common/interface/dto/common/metafield.dto';
import { CreateCustomFieldDto } from '@app/common/interface/dto/hubspot/create.customfield.dto';

@Controller('metafield')
export class MetafieldController {
  constructor(private readonly metafieldService: MetafieldService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Put('change-status/:id')
  async changeStatusMetaField(
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    return this.metafieldService.changemetaFieldStatus(id, user.sub)
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('from/:connectId/:module')
  async getMetaFieldFrom(
    @Param('connectId') connectId: string,
    @Param('module') module: CommonModuleName,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.metafieldService.getMetaFieldFrom(connectId, module, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('to/:connectId/:module')
  async getMetaFieldTo(
    @Param('connectId') connectId: string,
    @Param('module') module: CommonModuleName,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.metafieldService.getMetaFieldTo(connectId, module, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Put('associate')
  async associateField(
    @Req() req: Request,
    @Body() dto: AssociateFieldDto
  ) {
    const user = req['user'] as any;
    return this.metafieldService.associateField(dto, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Put('release-associate/:from_id')
  async releaseAssociate(
    @Req() req: Request,
    @Param('from_id') from_id: string,
  ) {
    const user = req['user'] as any;
    return this.metafieldService.releaseAssociate(from_id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Post('create-customfield')
  async createNewCustomField(
    @Req() req: Request,
    @Body() createCustomFieldDto: CreateCustomFieldDto
  ) {
    const user = req['user'] as any;
    return this.metafieldService.createNewCustomField(createCustomFieldDto, user.sub);
  }
}
