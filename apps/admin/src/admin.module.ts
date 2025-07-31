import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CommonModule } from '@app/common';
import { UserModule } from './user/user.module';
import { AuthModule } from 'apps/auth/src/auth.module';
import { TierModule } from './tier/tier.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [CommonModule.forRoot(), UserModule, AuthModule, TierModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }
