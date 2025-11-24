import { Module } from '@nestjs/common';
import { BcryptService } from './bcrypt.service';
import { EmailService } from './email.service';
import { JwtConfigService } from './jwt-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { getMailerConfig } from './mailer.config';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getMailerConfig,
    }),
  ],
  providers: [BcryptService, EmailService, JwtConfigService],
  exports: [BcryptService, EmailService, JwtConfigService],
})
export class HelpingApplicationModule {}
