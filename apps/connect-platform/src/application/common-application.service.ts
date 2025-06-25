import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { App, ModuleApp, Platform, User } from '@app/common';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { PaginationResponse } from '@app/common/interface/response/pagination.response';
import { ApplicationFilterDto, UpdateAppDto } from '@app/common/interface/dto/application/application.filter.sto';
import { CommonModuleName } from '@app/common/interface/enum/module.enum';
import * as jwt from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@app/common/interface/enum/user.enum';
import mongoose, {Schema, Types} from "mongoose";
@Injectable()
export class CommonApplicationService {

    constructor(
        @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
        @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
        @InjectModel(ModuleApp.name) private readonly moduleModel: SoftDeleteModel<ModuleApp>,
        @InjectModel(User.name) private userModel: SoftDeleteModel<User>,
        private readonly jwtService: JwtService
    ) { }

    private readonly JWT_SECRET = 'ec0b64d6c90a8f65d3d7878d224f50f49da3ccb988961953481133c4a29af5f233abebab0166cc3715d8d04356d346eb43a15ed948f7563db822f3ccb9f0ea756412f179aa4fea6c702a0881f92cda595777d07e6d6925df4c18c7b88eb38fcd453e0896be558a83ef5c4878ccf3ea9c3929d235a83a028fda72fb6762d6e0447db0c1555af25c6fac2ce2cd29cf88d51b6395790639f9fac3a4bce924c52985afbe000f793fe2122cfb71c5757282bec447ad4854b17a8dbc1fc43a01926f68f280e1d4b63af1994236d220eec116f1ac306cc08f6dc2e129f620617a64bcedb01184af4824faf659b2acffd613b71a4bceaa4de2f9a4bafd99343732a02b2d';

    async validateToken(token: string): Promise<any> {
        if (!token)
        {
            throw new BadRequestException('Token can not be null');
        }

        try
        {
            const payload: any = jwt.verify(token, this.JWT_SECRET, {
                algorithms: ['HS256'],
            });

            const email = payload.email;
            const display_name = payload.display_name;
            // return payload;
            const existUser = await this.userModel.findOne({ email }).exec();

            console.log("check payload: ", payload)
            console.log("check existUser: ", existUser)

            if (existUser)
            {
                console.log(" 0 create new")
                const payload = {
                    sub: existUser.id,
                    email: email,
                    role: Role.User,
                    name: display_name
                };

                const access_token = await this.jwtService.signAsync(payload);
                return access_token
            } else
            {
                console.log("create new")
                const created = new this.userModel({
                    name: display_name,
                    email: email,
                    password: `${Math.floor(Math.random() * 4535453524324)} onext`,
                });
                const newUser = await created.save();

                const payload = {
                    sub: newUser.id,
                    email: newUser.email,
                    role: Role.User,
                    name: newUser.name
                };

                const access_token = await this.jwtService.signAsync(payload);
                return access_token
            }

        } catch (err)
        {
            throw new BadRequestException('Token not valid or expried');
        }
    }

    async softDeleteApp(app_id: string, user_id: string) {
        const filter = {
            user: user_id,
            isDeleted: false,
            _id: app_id
        };

        const appPoint = await this.appModel.findOne(filter);
        if (appPoint?.isActive)
        {
            throw new BadRequestException("This source is currently part of a connection and cannot be deleted. Please remove all connections involving this source before attempting deletion.");
        }


        return await this.appModel.softDelete(filter)
    }

    async getAllApplication(
        applicationFilterDto: ApplicationFilterDto,
        user_id: string
    ): Promise<PaginationResponse> {
        const { platform, page, limit } = applicationFilterDto;



        let filter:any = {
            user: new Types.ObjectId(user_id),
            isDeleted: false,
        };



        if (platform)
        {
            const platformExist = await this.platformModel.findOne({ type: platform });
            if (platformExist)
            {
                filter.platform = platformExist._id.toString();
                console.log("filter có platform:", platformExist._id);
            } else
            {
                return {
                    data: [],
                    page,
                    size: limit,
                    totalPage: 0,
                    totalRecord: 0,
                };
            }
        }

        const totalRecord = await this.appModel.countDocuments(filter);

        const data = await this.appModel
            .find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('platform')
            .exec();


        const totalPage = Math.ceil(totalRecord / limit);

        return {
            data,
            page,
            size: limit,
            totalPage,
            totalRecord,
        };
    }

    async getOneByID(app_id: string, user_id: string) {
        const existApp = await this.appModel.findOne({
            user: user_id,
            _id: app_id
        })

        if (!existApp)
        {
            throw new NotFoundException("Not found app with this is");
        }

        return existApp;
    }

    async createModuleForApp(app_id: string, platform_id: string) {

        const listModule: any[] = []
        const createdCustomer = new this.moduleModel({
            app: app_id,
            platform: platform_id,
            displayName: 'Customer',
            type: CommonModuleName.CUSTOMER
        })

        createdCustomer.save();

        listModule.push(createdCustomer._id)

        const createdProduct = new this.moduleModel({
            app: app_id,
            platform: platform_id,
            displayName: 'Product',
            type: CommonModuleName.PRODUCT
        })

        createdProduct.save();

        listModule.push(createdProduct._id)

        const createdOrder = new this.moduleModel({
            app: app_id,
            platform: platform_id,
            displayName: 'Order',
            type: CommonModuleName.ORDER
        })

        createdOrder.save();

        listModule.push(createdOrder._id)

        return listModule;
    }

    async updateAppName(user_id: string, dto: UpdateAppDto) {
        const { id, name } = dto;
        const filter = {
            user: user_id,
            _id: id
        };

        const appPoint = await this.appModel.findOne(filter);

        if (!appPoint)
        {
            throw new NotFoundException("Not found this app!")
        }

        appPoint.name = name;

        appPoint.save();
    }

}