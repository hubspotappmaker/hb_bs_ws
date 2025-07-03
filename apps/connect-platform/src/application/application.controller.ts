import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ShopifyApplicationService } from './shopify-application.service';
import { ConnectShopifyDto } from '@app/common/interface/dto/shopify/shopify.dto';
import { Request, Response } from 'express';
import { Roles } from 'apps/auth/src/decorator/role.decorator';
import { Role } from '@app/common/interface/enum/user.enum';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { RolesGuard } from 'apps/auth/src/guard/roles.guard';
import { HubspotApplicationService } from './hubspot-application.service';
import { CommonApplicationService } from './common-application.service';
import {
  ApplicationFilterDto,
  GoogleDriveCredentialDto,
  UpdateAppDto,
} from '@app/common/interface/dto/application/application.filter.sto';
import { GoogleDriverApplicationService } from './google-driver-application.service';
import { AuthUser } from '@app/common/util/decorator/auth-user.decorator';
import { ApiQuery } from '@nestjs/swagger';

@Controller('application')
export class ApplicationController {
  constructor(
    private readonly shopifyApplicationService: ShopifyApplicationService,
    private readonly hubspotApplicationService: HubspotApplicationService,
    private readonly commonApplicationService: CommonApplicationService,
    private readonly googleDriveService: GoogleDriverApplicationService,
  ) { }

  @Get('connect_google')
  async connectGoogle(
    @Query('code') code: any,
    @Query('state') state: any,
    @Res() res: Response,
  ) {
    console.log('chekc state: ', state);
    // await this.hubspotApplicationService.connectHubspot(code, state,);
    res.redirect(`${process.env.CORS_ORIGIN}/home`);
  }

  @Get('get-user-info')
  @ApiQuery({ name: 'hubId', required: false, type: String })
  @ApiQuery({ name: 'portalId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'platformName', required: false, type: String })
  async getTokenWithUserInfo(
    @Query('hubId') hubId?: string,
    @Query('email') email?: string,
    @Query('portalId') portalId?: string,
    @Query('platformName') platformName?: string,
  ) {
    const query = { hubId, email, portalId, platformName };
    return this.googleDriveService.getUserTokenWithInfo(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Post('connect-shopify')
  async connectShopify(@Body() dto: ConnectShopifyDto, @Req() req: Request) {
    const user = req['user'] as any;
    console.log('check req: ', user.sub);
    return this.shopifyApplicationService.connectShopify(dto, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Put('reauth-shopify/:id')
  async reAuthShopify(
    @Body() dto: ConnectShopifyDto,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const user = req['user'] as any;
    console.log('check req: ', user.sub);
    return this.shopifyApplicationService.reAuthShopify(id, dto, user.sub);
  }

  @Get('token')
  async handleSsoWp(@Query('token') token: string, @Res() res: Response) {
    const code = await this.commonApplicationService.validateToken(token);
    res.redirect(`${process.env.CORS_ORIGIN}/authen?token=${code}`);
  }

  @Get('connect-hubspot')
  async connectHubspot(
    @Query('code') code: any,
    @Query('state') state: any,
    @Res() res: Response,
  ) {
    console.log('chekc state: ', state);
    await this.hubspotApplicationService.connectHubspot(code, state);
    res.redirect(`${process.env.CORS_ORIGIN}/home`);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('install-hubspot')
  async installHubspot(@Req() req: Request, @Query('prefix') prefix: string) {
    console.log('chekc run: installHubspot');
    const user = req['user'] as any;

    const payload = {
      user_id: user.sub,
      prefix: prefix,
    };

    const jstring = JSON.stringify(payload);

    const target_link = `${process.env.HUBSPOT_INSTALL_URL}&state=${jstring}`;
    console.log(target_link, '????????');
    return target_link;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Get('get-all')
  async getAllApplication(
    @Query() applicationFilterDto: ApplicationFilterDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    return this.commonApplicationService.getAllApplication(
      applicationFilterDto,
      user.sub,
    );
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User, Role.Admin)
  // @Get(':id')
  // async getOneByID(
  //   @Req() req: Request,
  //   @Param("id") id: string
  // ) {
  //   const user = req['user'] as any;
  //   return this.commonApplicationService.getOneByID(id, user.sub);
  // }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Delete('delete/:id')
  async deleteApplication(@Req() req: Request, @Param('id') id: string) {
    const user = req['user'] as any;
    return this.commonApplicationService.softDeleteApp(id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Patch('update')
  async updateNameConnect(@Body() dto: UpdateAppDto, @Req() req: Request) {
    const user = req['user'] as any;

    return this.commonApplicationService.updateAppName(user.sub, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @Post('connect-gg-driver')
  async connectGoogleDriver(
    @Body() dto: GoogleDriveCredentialDto,
    @AuthUser('sub') userId: string,
  ) {
    console.log("check dto save token: ", dto)
    return this.googleDriveService.connectGoogleDrive(dto, userId);
  }

  @Get('check-hub-id')
  async checkHubId(@Query('email') email: string) {
    const data = await this.googleDriveService.saveGoogleDriveFolderId(email);
    return data.hub_id;
  }


  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.User, Role.Admin)
  @Post('save-token')
  async checkValidToken(@Body() dto: GoogleDriveCredentialDto,) {
    console.log(dto, '<=============== dto save token')
    return await this.googleDriveService.updateCredential(dto);
  }
}
