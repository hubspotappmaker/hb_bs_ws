import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import * as qs from 'qs';
import { App } from '@app/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class HubspotCredentialService {
  constructor(
    @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
    private readonly httpService: HttpService,
  ) { }

  async getToken(app_id: string): Promise<string> {
    const pointApp = await this.appModel.findOne({ _id: app_id }).exec();
    if (!pointApp)
    {
      throw new HttpException('App not found', HttpStatus.NOT_FOUND);
    }

    const {
      access_token: oldAccessToken,
      refresh_token: oldRefreshToken,
      ...otherCreds
    } = pointApp.credentials as Record<string, any>;
    //@ts-ignore
    const lastUpdated: Date = pointApp.updatedAt as Date;
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    // console.log('Token age (minutes):', diffMinutes.toFixed(2));

    let accessToken = oldAccessToken;

    if (diffMinutes > 20)
    {
      try
      {
        const body = qs.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.HUBSPOT_CLIENT_ID,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET,
          refresh_token: oldRefreshToken,
        });

        const resp = await this.httpService
          .post('https://api.hubapi.com/oauth/v1/token', body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          .toPromise();

        const data = resp?.data as {
          access_token: string;
          refresh_token: string;
        };

        pointApp.credentials = {
          ...otherCreds,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };

        await pointApp.save();

        // console.log('Saved refreshed credentials:', {
        //   access_token: data.access_token,
        //   refresh_token: data.refresh_token,
        // });

        accessToken = data.access_token;
      } catch (err)
      {
        throw new HttpException(
          `Hubspot credentials is not valid : ${err.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    return accessToken;
  }
}
