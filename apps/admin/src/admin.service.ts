import { App } from '@app/common';
import { GoogleDriveCredentialDto } from '@app/common/interface/dto/application/application.filter.sto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class AdminService {

  constructor(
    @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
  ) { }
  getHello(): string {
    return 'Hello World!';
  }

  async createQueueApp(dto: GoogleDriveCredentialDto) {
    const name = `HubSpot[${dto.hub_id}]`;

    const queueApp = new this.appModel({
      name: name,
      platform: "686f6896c4132a30126636af",
      isQueue: true,
      isActive: false,
      credentials: {
        access_token: "default",
        email: dto.email,
        token_type: "hubspot_access_token"
      }
    });

    return await queueApp.save();

  }
}
