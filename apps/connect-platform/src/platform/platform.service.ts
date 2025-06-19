import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Platform } from '@app/common';
import { CreatePlatformDto } from '@app/common/interface/dto/common/platform.dto';

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(Platform.name) private platformModel: Model<Platform>,
  ) { }

  async createPlatform(createPlatformDto: CreatePlatformDto) {
    const { name, type, baseUrl } = createPlatformDto;

    // if baseUrl was provided, ensure it's unique
    if (baseUrl)
    {
      const exists = await this.platformModel.exists({ baseUrl });
      if (exists)
      {
        throw new ConflictException(
          `A platform with baseUrl "${baseUrl}" already exists.`,
        );
      }
    }

    if (baseUrl)
    {
      const exists = await this.platformModel.exists({ name });
      if (exists)
      {
        throw new ConflictException(
          `A platform with name "${name}" already exists.`,
        );
      }
    }

    const newPlatform = new this.platformModel({
      name,
      type,
      baseUrl,
    });
    return newPlatform.save();
  }
}
