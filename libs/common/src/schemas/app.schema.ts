import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class App extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Platform', required: true })
  platform: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId ;

  @Prop({ required: true })
  name: string;

  @Prop() lastLoginAt?: Date;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'ModuleApp', default: [] })
  ModuleApp: Types.ObjectId[];

  @Prop({ type: Object })
  credentials: Record<string, any>;

  @Prop({ type: [String], default: [] })
  webhookIds: string[];

}


export const AppSchema = SchemaFactory.createForClass(App);
