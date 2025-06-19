import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Tier } from '@app/common/schemas/tier.schema';
import { PaginationDto } from '@app/common/interface/dto/common/pagination.dto';
import { CreateTierDto, UpdateTierDto } from '@app/common/interface/dto/tier/tier.dto';

@Injectable()
export class TierService {
    constructor(
        @InjectModel(Tier.name) private tierModel: SoftDeleteModel<Tier>,
    ) { }

    async getAllTier(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        const filter: Record<string, any> = {};

        const totalRecord = await this.tierModel.countDocuments(filter);
        const totalPage = Math.ceil(totalRecord / limit);

        const data = await this.tierModel
            .find(filter)
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

    async createNewTier(createTierDto: CreateTierDto) {
        const newTier = new this.tierModel(createTierDto);
        return newTier.save();
    }

    async updateTier(id: string, updateTierDto: UpdateTierDto) {
        const updated = await this.tierModel.findOneAndUpdate(
            { _id: id },
            { $set: updateTierDto },
            { new: true },
        );
        if (!updated)
        {
            throw new NotFoundException(`Tier with ID ${id} not found`);
        }
        return updated;
    }

    async getDetail(id: string) {
        const tier = await this.tierModel.findById(id).exec();
        if (!tier)
        {
            throw new NotFoundException(`Tier with ID ${id} not found`);
        }
        return tier;
    }

    async softDeleteTier(id: string) {
        const result = await this.tierModel.softDelete({ _id: id });

        return result;
    }
}
