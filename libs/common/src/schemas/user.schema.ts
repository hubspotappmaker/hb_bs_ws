import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../interface/enum/user.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'App' }], default: [] })
  connectedApps: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Tier', required: false, default: "6875c69a4542710d8819b760" })
  tier: Types.ObjectId;

  @Prop({ type: String, enum: Role, default: Role.User })
  role: Role;

  @Prop() firstName?: string;
  @Prop() lastName?: string;
  @Prop() avatarUrl?: string;
  @Prop() phone?: string;
  @Prop() address?: string;

  @Prop({ required: false }) expiredDate?: Date;

  @Prop({ required: false, default: false }) isExpired?: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop() lastLoginAt?: Date;
  @Prop({ default: true })
  isActive: boolean;

}

export const UserSchema = SchemaFactory.createForClass(User);
