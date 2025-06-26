import { HttpService } from '@nestjs/axios';
import { Injectable, Res, BadRequestException, InternalServerErrorException, NotFoundException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom, Observable } from 'rxjs';
import { App, Field, Platform, User } from '@app/common';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { GroupConfig, PropertyConfig } from '@app/common/interface/type/request.type';
import { CommonApplicationService } from './common-application.service';
import { HubspotCredentialService } from 'apps/hubspot/src/hubspot.credential.service';
import { Connect } from '@app/common/schemas/connect.schema';

@Injectable()
export class HubspotApplicationService {
  private tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
  private tokenInfoUrl = 'https://api.hubapi.com/integrations/v1/me';

  constructor(
    @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
    @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
    @InjectModel(User.name) private readonly userModel: SoftDeleteModel<User>,
    @InjectModel(Connect.name) private readonly connectModel: SoftDeleteModel<Connect>,
    @InjectModel(Field.name) private readonly fieldModel: SoftDeleteModel<Field>,
    private readonly httpService: HttpService,
    private readonly commonApplicationService: CommonApplicationService,
    private readonly hubspotCredentialService: HubspotCredentialService
  ) { }

  async connectHubspot(code: any, state: any) {
    console.log(code,state)
    const { user_id, prefix, portalId,email,fullName } = JSON.parse(state)

    const proPrifix: string = prefix;

    if (!code || !user_id)
    {
      throw new BadRequestException('Missing requird parameters: code or user_id');
    }

    const existUser = await this.userModel.findOne({ _id: user_id });
    if (!existUser)
    {
      throw new NotFoundException('Not found user with this id');
    }

    if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET || !process.env.HUBSPOT_REDIRECT_URL)
    {
      throw new InternalServerErrorException('HubSpot configuration is missing');
    }


    const platform = await this.platformModel.findOne({ name: 'Hubspot' });
    if (!platform)
    {
      throw new NotFoundException(`Platform with name Hubspot not found`);
    }

    const existingApp = await this.appModel.findOne({
      user: user_id,
      'credentials.hub_id': portalId,
      isDeleted: false
    });


    if (existingApp)
    {
      console.log(`Đã tìm thấy App tồn tại với user=${user_id} và portalId=${portalId}, tiến hành UPDATE.`);

      if (existingApp.credentials.prefix !== prefix)
      {
        console.log('ko giong')
        const listConnect = await this.connectModel.find({
          user: user_id,
          to: existingApp.id
        }).exec();

        // console.log("check listConnect: ", listConnect);
        if (listConnect.length > 0)
        {
          console.log("check listConnect: ", listConnect)
          const updatePromises = listConnect.map(async conn => {
            await this.connectModel.findByIdAndUpdate(
              conn._id,
              { syncMetafield: false },
            ).exec()
            console.log("conn.id: ", conn.id)
            const allField = await this.fieldModel.deleteMany({
              connect: conn.id,
              user: user_id
            });

            console.log("check allField: ", allField)
          }
          );
          await Promise.all(updatePromises);
        }
      }



      existingApp.credentials = {
        portalId,
        // refresh_token,
        // access_token,
        email,
        fullName,
        prefix
      };



      await existingApp.save();
      return existingApp;
    } else
    {
      console.log(`Không tìm thấy App với user=${user_id} và portalId=${portalId}, tiến hành CREATE mới.`);

      const createdApp = new this.appModel({
        platform: platform._id,
        name: `Hubspot[${portalId}]`,
        user: user_id,
        credentials: { portalId,
          // refresh_token, access_token,
          email, fullName, prefix },
      });

      const pointApp = await createdApp.save();
      const listModule = await this.commonApplicationService.createModuleForApp(pointApp._id, platform._id);
      pointApp.ModuleApp = listModule;

      return pointApp.save();
    }
  }


  async  connectGoogleDrive( dto:any ){


  }


  async createCustomProperty(
    token: string,
    config: PropertyConfig
  ): Promise<{ status: number; msg: string }> {
    const propertyUrl = `https://api.hubapi.com/crm/v3/properties/${config.objectType}`;
    const { objectType, ...body } = config;

    try
    {
      await this.delay(500);
      const axiosResponse = await lastValueFrom(
        this.httpService.post(propertyUrl, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );
      return {
        status: axiosResponse.status,
        msg: 'Property created successfully',
      };
    } catch (err: any)
    {
      if (err.response)
      {
        const status = err.response.status;
        const data = err.response.data;
        return {
          status,
          msg: data.message || JSON.stringify(data),
        };
      }
      return {
        status: 503,
        msg: `Network error: ${err.message}`,
      };
    }
  }

  async createCustomGroupName(
    token: string,
    config: GroupConfig
  ): Promise<{ status: number; msg: string }> {
    const groupUrl = `https://api.hubapi.com/crm/v3/properties/${config.objectType}/groups`;
    const { objectType, ...body } = config; // Exclude objectType from the body

    try
    {
      const axiosResponse = await lastValueFrom(
        this.httpService.post(groupUrl, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );
      return {
        status: axiosResponse.status,
        msg: 'Group created successfully',
      };
    } catch (err: any)
    {
      if (err.response)
      {
        const status = err.response.status;
        const data = err.response.data;
        return {
          status,
          msg: data.message || JSON.stringify(data),
        };
      }
      return {
        status: 503,
        msg: `Network error: ${err.message}`,
      };
    }
  }

  async validateHubspotToken(app_id: string): Promise<void> {
    const token = await this.hubspotCredentialService.getToken(app_id);
    console.log("check token: ", token)
    if (!token)
    {
      throw new BadRequestException('HubSpot token not found for this app_id');
    }

    const checkUrl = `${this.tokenInfoUrl}`;

    try
    {
      const response = await lastValueFrom(
        this.httpService.get(checkUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
      );

      console.log("check response: ", response)

      if (response.status !== 200)
      {
        throw new UnauthorizedException('HubSpot token is invalid or expired');
      }
    } catch (err: any)
    {
      if (err.response && (err.response.status === 401 || err.response.status === 403))
      {
        throw new UnauthorizedException('HubSpot token is invalid or expired');
      }
      throw new UnauthorizedException(
        `Error checking HubSpot token`,
      );
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
