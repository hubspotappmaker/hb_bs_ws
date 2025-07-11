import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommonModuleName } from '../interface/enum/module.enum';

@Schema({ timestamps: true })
export class ModuleApp extends Document {

  @Prop({ type: Types.ObjectId, ref: 'App', required: true })
  app: Types.ObjectId;

  @Prop()
  displayName: string;

  @Prop({ type: String, enum: CommonModuleName, required: true })
  type: CommonModuleName;

  @Prop({ type: Types.ObjectId, ref: 'Platform', required: true })
  platform: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Field', default: [] })
  fields: Types.ObjectId[];
}

export const ModuleSchema = SchemaFactory.createForClass(ModuleApp);
