import { MailerOptions } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export const getMailerConfig = (
  configService: ConfigService,
): MailerOptions => {
  return {
    transport: {
      service: 'gmail',
      auth: {
        user: configService.getOrThrow<string>('EMAIL_USER'),
        pass: configService.getOrThrow<string>('EMAIL_PASS'),
      },
    },
  };
};
