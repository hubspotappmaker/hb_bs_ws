import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import {InjectModel, Prop} from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {App, Platform, User} from '@app/common';
import { SignInDto, SignUpDto } from '@app/common/interface/dto/common/auth.dto';
import { JwtService } from '@nestjs/jwt';
import {firstValueFrom} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {SoftDeleteModel} from "soft-delete-plugin-mongoose";
import {GoogleLoginDto} from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
      private readonly httpService: HttpService,
      @InjectModel(User.name) private userModel: SoftDeleteModel<User>,
      @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
      @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
      private jwtService: JwtService
  ) { }

  async signUp(signUpDto: SignUpDto) {
    const { name, email, password } = signUpDto;

    const exists = await this.userModel.findOne({ email }).exec();
    if (exists)
    {
      throw new ConflictException(`Email "${email}" is already in use`);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const created = new this.userModel({
      name,
      email,
      password: hashedPassword,
    });
    const user = await created.save();

    const result = user.toObject();
    return result;
  }

  async getUserById(id: string) {
    if (!Types.ObjectId.isValid(id))
    {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user)
    {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async validateUser(email: string, plainPassword: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(plainPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const result = user;
    return result;
  }

  async signIn(signInDto: SignInDto) {
    const isValidUser = await this.validateUser(signInDto.email, signInDto.password);

    if (isValidUser)
    {
      const payload = {
        sub: isValidUser.id,
        email: isValidUser.email,
        role: isValidUser.role,
        name: isValidUser.name
      };

      const access_token = await this.jwtService.signAsync(payload);

      return {
        ...payload,
        access_token
      }
    }
  }

  private async fetchGoogleUserInfo(access_token: any): Promise<any> {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo';

    try {
      const res = await firstValueFrom(
          this.httpService.get(url, {
            headers: { Authorization: `Bearer ${access_token}` },
          }),
      );

      return res.data;
    } catch (error) {
      const errMsg = error?.response?.data || error.message || 'Unknown error';
      return null;
    }
  }

  async googleLogin( googleLoginDto: GoogleLoginDto) {
    const userInfo = await this.fetchGoogleUserInfo({
      access_token: googleLoginDto?.access_token
    });

    let user = await this.userModel.findOne({ email: userInfo?.email });
    if (!user) {
      user = await this.userModel.create({ email: userInfo.email, name: userInfo?.name || '' });
    }

    const platform = await this.platformModel.findOne({ name: 'google_drive' });
    if (!platform) throw new NotFoundException('Platform google not found');

    let app = await this.appModel.findOne({ user: user._id, platform: platform._id });
    const credentials = {
      access_token: googleLoginDto.access_token,
      refresh_token: googleLoginDto.refresh_token,
    };

    if (!app) {
      app = await this.appModel.create({
        user: user._id,
        platform: platform._id,
        credentials,
      });
    } else {
      app.credentials = credentials;
      await app.save();
    }

    return {
      email: userInfo.email,
      access_token: googleLoginDto.access_token,
      message: 'success',
    };

  }

}
