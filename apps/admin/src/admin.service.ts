import { App, User } from '@app/common';
import { GoogleDriveCredentialDto } from '@app/common/interface/dto/application/application.filter.sto';
import { Log } from '@app/common/schemas/log.schema';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class AdminService {

  constructor(
    @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
    @InjectModel(User.name) private readonly userModel: SoftDeleteModel<User>,
    @InjectModel(Log.name) private readonly logModel: SoftDeleteModel<Log>,
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

  async logActionUpload(hubId: string) {

    const hubApp = await this.appModel.findOne({
      'credentials.hub_id': hubId,
      isDeleted: false,
      platform: new Types.ObjectId("686f6896c4132a30126636af"),
    });

    if (!hubApp) {
      throw new NotFoundException(`App with id ${hubId} not found`);
    }

    const user = await this.userModel.findOne({ _id: hubApp.user });
    if (!user) {
      throw new NotFoundException(`User with id ${hubApp.user} not found`);
    }

    return await this.logModel.create({
      status: true,
      user: user._id,
      app: hubApp._id,
    });

  }

  async countLogsByUser(userId: string) {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    const data = await this.logModel.find({ user: user._id, isDeleted: false }).populate("app");
    return {
      record: data,
      count: data.length
    }
  }

  async countLogsByApp(appId: string) {
    const app = await this.appModel.findOne({ _id: appId, isDeleted: false });
    if (!app) {
      throw new NotFoundException(`App with id ${appId} not found`);
    }
    const data = await this.logModel.find({ app: app._id, isDeleted: false });

    return {
      record: data,
      count: data.length
    }
  }
}
