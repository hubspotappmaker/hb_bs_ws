import { App, ModuleApp, Platform } from '@app/common';
import { ConnectShopifyDto } from '@app/common/interface/dto/shopify/shopify.dto';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadGatewayException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { CommonApplicationService } from './common-application.service';
import { ShopifyPermission } from '@app/common/interface/enum/shopify/shopify.enum';
import { PlatformName } from '@app/common/interface/enum/platform.enum';

@Injectable()
export class ShopifyApplicationService {
  constructor(
    @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
    @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
    private readonly httpService: HttpService,
    private readonly commonApplicationService: CommonApplicationService,
  ) { }

  async validateShopifyPermissions(url: string, token: string): Promise<void> {
    const scopesUrl = `${url}/admin/oauth/access_scopes.json`;
    try
    {
      const response = await firstValueFrom(
        this.httpService.get(scopesUrl, {
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
        }),
      );
      if (response.status !== 200)
      {
        throw new UnauthorizedException('Invalid token or URL');
      }

      const scopes: Array<{ handle: string }> = response.data.access_scopes;
      const returnedPermissions = scopes.map((s) => s.handle);
      const requiredPermissions = Object.values(ShopifyPermission);
      const missingPermissions = requiredPermissions.filter(
        (p) => !returnedPermissions.includes(p),
      );

      if (missingPermissions.length > 0)
      {
        throw new BadRequestException(
          `Missing permissions: ${missingPermissions.join(', ')}`,
        );
      }

      console.log('Everything is OK');
    } catch (err)
    {
      if (err instanceof AxiosError)
      {
        throw new UnauthorizedException('Invalid token or URL');
      }
      throw err;
    }
  }


  async connectShopify(dto: ConnectShopifyDto, userId: string) {
    const existApp = await this.appModel.findOne({
      user: userId,
      'credentials.shopUrl': dto.credentials.shopUrl,
      isDeleted: false
    });

    if (existApp)
    {
      throw new ConflictException("Shopify source with this is aready exist!")
    }
    const platform = await this.platformModel.findOne({ name: 'Shopify' });
    if (!platform)
    {
      throw new NotFoundException('Shopify platform not found');
    }

    const rawUrl = dto.credentials.shopUrl.trim();
    const normalizedUrl = rawUrl.replace(/\/+$/, '');

    await this.validateShopifyPermissions(normalizedUrl, dto.credentials.accessToken);

    const createdApp = new this.appModel({
      platform: platform._id,
      name: `Shopify[${dto.name}]`,
      user: userId,
      credentials: {
        ...dto.credentials,
        shopUrl: normalizedUrl,
      },
    });
    await createdApp.save();

    const pointApp = await createdApp.save();
    const listModule = await this.commonApplicationService.createModuleForApp(pointApp._id, platform._id);
    pointApp.ModuleApp = listModule;

    return pointApp.save();
  }

  async reAuthShopify(id: string, dto: ConnectShopifyDto, userId: string) {

    const existApp = await this.appModel.findOne({
      _id: id,
      user: userId
    }).populate('platform')


    if (!existApp)
    {
      throw new NotFoundException("Not found app with this id!")
    }

    //@ts-ignore
    if (PlatformName.SHOPIFY !== existApp.platform.name)
    {
      throw new BadRequestException("Only Support Shopify App! ")
    }

    const rawUrl = dto.credentials.shopUrl.trim();
    const normalizedUrl = rawUrl.replace(/\/+$/, '');

    await this.validateShopifyPermissions(normalizedUrl, dto.credentials.accessToken);

    existApp.name = dto.name
    existApp.credentials = {
      ...dto.credentials,
      shopUrl: normalizedUrl,
    }


    return existApp.save();
  }
}
