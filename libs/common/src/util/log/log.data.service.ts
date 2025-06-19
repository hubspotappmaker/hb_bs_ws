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
        if (logDto.connect)
        {
            const connectId = Types.ObjectId.isValid(logDto.connect)
                ? new Types.ObjectId(logDto.connect)
                : (logDto.connect as Types.ObjectId);

            const connectDoc = await this.connectModel
                .findById(connectId)
                .populate({ path: 'from', select: 'name' })
                .populate({ path: 'to', select: 'name' })
                .exec();

            if (!connectDoc)
            {
                throw new NotFoundException(`Cannot find Connect with id: ${connectId}`);
            }

            switch (logDto.module)
            {
                case CommonModuleName.CUSTOMER:
                    await this.connectModel.updateOne(
                        { _id: connectId },
                        { $inc: { migratedContacts: 1 } }
                    );
                    break;
                case CommonModuleName.PRODUCT:
                    await this.connectModel.updateOne(
                        { _id: connectId },
                        { $inc: { migratedProducts: 1 } }
                    );
                    break;
                case CommonModuleName.ORDER:
                    await this.connectModel.updateOne(
                        { _id: connectId },
                        { $inc: { migratedOrders: 1 } }
                    );
                    break;
            }

            logDto.user = connectDoc.user;

            const infoPayload = {
                connectName: connectDoc.name,
                fromName: (connectDoc.from as any)?.name || null,
                toName: (connectDoc.to as any)?.name || null,
            };

            logDto.info = infoPayload;

            logDto.nameLog = nameLog;
        }

        const logged = await this.logModel.create(logDto);
        logged.nameLog = nameLog;
        await logged.save();
        return logged;
    }
}