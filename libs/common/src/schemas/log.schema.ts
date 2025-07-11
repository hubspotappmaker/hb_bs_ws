import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommonModuleName } from '../interface/enum/module.enum';

@Schema({ timestamps: true })
export class Log extends Document {
    @Prop({ default: false })
    status: boolean;

    @Prop({ type: Types.ObjectId, ref: 'Connect', required: false })
    connect: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    user: Types.ObjectId;

    @Prop({ type: Object })
    dataPush: Object;

    @Prop({ type: Object })
    info: Object;

    @Prop({ enum: CommonModuleName, type: String })
    module: CommonModuleName;

    @Prop({ required: false })
    nameLog: string;

    @Prop({ type: Object })
    message: Object;
}

export const LogSchema = SchemaFactory.createForClass(Log);
