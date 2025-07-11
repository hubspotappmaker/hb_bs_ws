import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Tier extends Document {

    @Prop({ required: true })
    name: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ required: true })
    connectLimit: number;

    @Prop({ required: true })
    appLimit: number;

    @Prop({ required: true })
    orderSyncLimit: number;

    @Prop({ required: true })
    productSyncLimit: number;

    @Prop({ required: true })
    customerSyncLimit: number;

    @Prop({ required: true })
    metafieldLimit: number;

}

export const TierSchema = SchemaFactory.createForClass(Tier);
