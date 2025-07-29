import { App, User } from '@app/common';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { PaginationResponse } from '@app/common/interface/response/pagination.response';
import { Connect } from '@app/common/schemas/connect.schema';
import { Tier } from '@app/common/schemas/tier.schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: SoftDeleteModel<User>,
        @InjectModel(Tier.name) private tierModel: SoftDeleteModel<Tier>,
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
        @InjectModel(Connect.name) private connectModel: SoftDeleteModel<Connect>,
    ) { }


    async deleteAccount(id: string): Promise<void> {

        try
        {
            const user = await this.userModel.findOne({ _id: id });
            if (!user)
            {
                throw new NotFoundException(`User with id ${id} not found`);
            }

            await this.connectModel.softDelete({ user: new mongoose.Types.ObjectId(id) });

            await this.appModel.softDelete({ user: new mongoose.Types.ObjectId(id) });

            await this.userModel.softDelete({ _id: new mongoose.Types.ObjectId(id) });

        } catch (error)
        {

            throw new BadRequestException('Failed to delete account');
        }
    }

    async changeExpiredStatus(id: string, status: boolean) {

        try
        {
            const user = await this.userModel.findOne({ _id: id });
            if (!user)
            {
                throw new NotFoundException(`User with id ${id} not found`);
            }

            user.isExpired = status;

            return await user.save()

        } catch (error)
        {

            throw new BadRequestException('Failed change expired status');
        }
    }

    async setExpiredDate(id: string, date: Date) {

        try
        {
            const user = await this.userModel.findOne({ _id: id });
            if (!user)
            {
                throw new NotFoundException(`User with id ${id} not found`);
            }

            user.expiredDate = date;

            return await user.save()

        } catch (error)
        {

            throw new BadRequestException('Failed set expired status');
        }
    }

    async checkExpired(id: string) {

        try
        {
            const user = await this.userModel.findOne({ _id: id });
            if (!user)
            {
                throw new NotFoundException(`User with id ${id} not found`);
            }


            return {
                isExpired: user.isExpired,
                expiredDate: user.expiredDate
            }

        } catch (error)
        {

            throw new BadRequestException('Failed check expired status');
        }
    }

    async checkExpiredHubspot(hubId: string) {

        try
        {
            const hubApp = await this.appModel.findOne({
                'credentials.hub_id': hubId,
                isDeleted: false,
                platform: new Types.ObjectId("686f6896c4132a30126636af"),
            });

            if (!hubApp)
            {
                throw new NotFoundException(`App with id ${hubId} not found`);
            }

            const user = await this.userModel.findOne({ _id: hubApp.user });
            if (!user)
            {
                throw new NotFoundException(`User with id ${hubApp.user} not found`);
            }


            return {
                isExpired: user.isExpired,
                expiredDate: user.expiredDate
            }

        } catch (error)
        {

            throw new BadRequestException('Failed check expired status');
        }
    }

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
            "credentials.token_type": "hubspot_access_token",
            isQueue: { $ne: true },
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

    async getQueueUser(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;

        const filter: Record<string, any> = {
            "credentials.token_type": "hubspot_access_token",
            isQueue: true,
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
