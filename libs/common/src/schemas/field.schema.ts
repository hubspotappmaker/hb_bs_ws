// src/field/schemas/field.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DataType } from '../interface/enum/platform.enum';
import { FieldType } from '../interface/enum/field.enum';
import { CommonModuleName } from '../interface/enum/module.enum';

@Schema({ timestamps: true })
export class Field extends Document {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: false })
  description: string;

  @Prop({ type: String, enum: FieldType, default: FieldType.CUSTOM })
  type: FieldType;

  @Prop({ type: String, enum: CommonModuleName, required: false })
  moduletype: CommonModuleName;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Field', required: false })
  mappingField: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Connect', required: false })
  connect: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user: Types.ObjectId;

  @Prop({ type: String, enum: DataType, default: DataType.STRING })
  dataType: DataType;
}

export const FieldSchema = SchemaFactory.createForClass(Field);
