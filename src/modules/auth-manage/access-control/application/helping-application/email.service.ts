import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendConfirmationEmail(email: string, code: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Подтверждение регистрации',
      text: `Подтвердите регистрацию по ссылке: https://somesite.com/confirm-email?code=${code}`,
      html: `
        <h1>Thank for your registration</h1>
        <p>To finish registration please follow the link below:
            <a href='https://somesite.com/confirm-email?code=${code}'>complete registration</a>
        </p>
      `,
    });
  }

  async sendRecoveryEmail(email: string, recoveryCode: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Восстановление пароля',
      text: `Восстановите пароль по ссылке: https://somesite.com/recover?code=${recoveryCode}`,
      html: `
        <h1>Password Recovery</h1>
        <p>To reset your password please follow the link below:
            <a href='https://somesite.com/recover?code=${recoveryCode}'>reset password</a>
        </p>
      `,
    });
  }
}
