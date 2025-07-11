import { FilterLogDto } from '@app/common/interface/dto/log/log.filter.dto';
import { Log } from '@app/common/schemas/log.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { PaginationResponse } from '@app/common/interface/response/pagination.response';

@Injectable()
export class LogService {
    constructor(
        @InjectModel(Log.name)
        private readonly logModel: SoftDeleteModel<Log>,
    ) { }

    async getAll(
        filterLogDto: FilterLogDto,
        user_id: string,
    ): Promise<PaginationResponse> {
        const { module, status, page, limit } = filterLogDto;

        const filter: any = { user: user_id };
        if (module)
        {
            filter.module = module;
        }
        if (typeof status === 'boolean')
        {
            filter.status = status;
        }

        const totalRecord = await this.logModel.countDocuments(filter);

        const totalPage = Math.ceil(totalRecord / limit) || 1;

        const data = await this.logModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        return {
            data,
            page,
            size: data.length,
            totalPage,
            totalRecord,
        };
    }
}
