import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Delete } from '@nestjs/common';
import { TierService } from './tier.service';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { CreateTierDto, UpdateTierDto } from '@app/common/interface/dto/tier/tier.dto';

@Controller('tier')
export class TierController {
  constructor(private readonly tierService: TierService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.User)
  @Get('get-all')
  async getAllTier(@Query() paginationDto: PaginationDto) {
    return this.tierService.getAllTier(paginationDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('create')
  async createTier(@Body() createTierDto: CreateTierDto) {
    return this.tierService.createNewTier(createTierDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.tierService.getDetail(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put('update/:id')
  async updateTier(
    @Param('id') id: string,
    @Body() updateTierDto: UpdateTierDto,
  ) {
    return this.tierService.updateTier(id, updateTierDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete('delete/:id')
  async softDeleteTier(@Param('id') id: string) {
    return this.tierService.softDeleteTier(id);
  }
}