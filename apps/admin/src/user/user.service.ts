import { App, User } from '@app/common';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { PaginationResponse } from '@app/common/interface/response/pagination.response';
import { Tier } from '@app/common/schemas/tier.schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: SoftDeleteModel<User>,
        @InjectModel(Tier.name) private tierModel: SoftDeleteModel<Tier>,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
    ) { }

    async getAllUser(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;

        const filter: Record<string, any> = {

        };

        const totalRecord = await this.userModel.countDocuments(filter);

        const totalPage = Math.ceil(totalRecord / limit);

        const data = await this.userModel
            .find(filter)
            .populate('tier')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        return {
            data,
            page,
            size: limit,
            totalPage,
            totalRecord,
        };
    }

    async getSourceUser(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;

        const filter: Record<string, any> = {
            "credentials.token_type": "hubspot_access_token"
        };

        const totalRecord = await this.appModel.countDocuments(filter);

        const totalPage = Math.ceil(totalRecord / limit);

        const data = await this.appModel
            .find(filter)
            .populate('user')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        return {
            data,
            page,
            size: limit,
            totalPage,
            totalRecord,
        };
    }

    async changeStatus(id: string, status: boolean) {
        const existUser = await this.userModel.findOne({
            _id: id
        })

        if (!existUser)
        {
            throw new NotFoundException("Cannot update user not existed!");
        }

        existUser.isActive = status;
        return await existUser.save()
    }

    async changeTier(id: string, tierID: any) {
        const existUser = await this.userModel.findOne({
            _id: id
        })

        if (!existUser)
        {
            throw new NotFoundException("Cannot update user not existed!");
        }

        const existTier = await this.tierModel.findOne({
            _id: tierID
        })

        if (!existTier)
        {
            throw new NotFoundException("Cannot associate tier not existed!");
        }

        if (!existTier.isActive)
        {
            throw new BadRequestException("Can not associate inactivate tier");
        }

        existUser.tier = tierID;

        return await existUser.save()
    }
}
