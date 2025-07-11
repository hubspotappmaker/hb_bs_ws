// src/platform/schemas/platform.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlatformType } from '../interface/enum/platform.enum';

@Schema({ timestamps: true })
export class Platform extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  baseUrl: string;

  @Prop({ type: String, enum: PlatformType, required: true })
  type: PlatformType;

}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
