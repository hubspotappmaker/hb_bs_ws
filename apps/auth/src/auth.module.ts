import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CommonModule } from '@app/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './guard/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guard/roles.guard';
import {HttpModule} from "@nestjs/axios";


@Module({
  imports: [
    HttpModule,
    CommonModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRED_TIME },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
  ],
  exports: [AuthService, AuthGuard]
})
export class AuthModule {}
