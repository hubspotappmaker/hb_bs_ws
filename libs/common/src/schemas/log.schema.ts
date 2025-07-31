import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Log extends Document {
    @Prop({ default: false })
    status: boolean;

    @Prop({ default: false })
    nameLog: string

    @Prop({ type: Types.ObjectId, ref: 'App', required: false })
    app: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    user: Types.ObjectId;

}

export const LogSchema = SchemaFactory.createForClass(Log);
