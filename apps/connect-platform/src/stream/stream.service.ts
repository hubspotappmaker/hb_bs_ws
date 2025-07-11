// stream.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Connect } from '@app/common/schemas/connect.schema';

@Injectable()
export class StreamService {
    constructor(
        @InjectModel(Connect.name) private connectModel: Model<Connect>,
    ) { }

    // Trả về ChangeStream của MongoDB
    watchConnect(connectId: string) {
        const objectId = new Types.ObjectId(connectId);

        return this.connectModel.watch(
            [
                {
                    $match: {
                        'documentKey._id': objectId,
                        operationType: 'update',
                    },
                },
            ],
            {
                fullDocument: 'updateLookup',
                batchSize: 10,
            },
        );
    }
}
