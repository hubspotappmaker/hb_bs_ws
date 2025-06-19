import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { CreatePlatformDto } from '@app/common/interface/dto/common/platform.dto';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('create-platform')
  async CreatePlatform(@Body() createPlatformDto: CreatePlatformDto) {
    return this.platformService.createPlatform(createPlatformDto)
  }
}
