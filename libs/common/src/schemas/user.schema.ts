import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../interface/enum/user.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'App' }], default: [] })
  connectedApps: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Tier', required: false })
  tier: Types.ObjectId;

  @Prop({ type: String, enum: Role, default: Role.User })
  role: Role;

  @Prop() firstName?: string;
  @Prop() lastName?: string;
  @Prop() avatarUrl?: string;
  @Prop() phone?: string;
  @Prop() address?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop() lastLoginAt?: Date;
  @Prop({ default: true })
  isActive: boolean;

}

export const UserSchema = SchemaFactory.createForClass(User);
