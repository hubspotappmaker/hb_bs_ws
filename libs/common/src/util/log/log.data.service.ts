import { Log } from '@app/common/schemas/log.schema';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Model, Types } from 'mongoose';
import { Connect } from '@app/common/schemas/connect.schema';
import { CommonModuleName } from '@app/common/interface/enum/module.enum';

@Injectable()
export class LogDataService {
    constructor(
        @InjectModel(Log.name)
        private readonly logModel: SoftDeleteModel<Log>,
        @InjectModel(Connect.name)
        private readonly connectModel: Model<Connect>,
    ) { }

    async logDataSync(logDto: Partial<Log>, nameLog: string) {

    }
}