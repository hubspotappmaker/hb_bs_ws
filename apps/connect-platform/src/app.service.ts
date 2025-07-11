import { User } from '@app/common';
import { Injectable, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthGuard } from 'apps/auth/src/guard/auth.guard';
import { Model } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<User>,
  ) { }

  async getUserInfo(user_id: string) {
    return await this.userModel.find({
      _id: user_id
    }).select('-password');
  }
}
