import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Connect extends Document {

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'App', required: true })
    from: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'App', required: true })
    to: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ default: false })
    isSyncing: boolean;

    @Prop({ default: 0 })
    migratedContacts: number;

    @Prop({ default: 0 })
    migratedOrders: number;

    @Prop({ default: 0 })
    migratedProducts: number;

    @Prop({ default: false })
    syncMetafield: boolean;

    @Prop({ default: true })
    isActive: boolean;

}

export const ConnectSchema = SchemaFactory.createForClass(Connect);
