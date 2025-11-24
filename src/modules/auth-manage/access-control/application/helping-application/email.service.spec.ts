/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mockMailerService: any;

  beforeEach(async () => {
    const mockMailerServiceProvider = {
      provide: MailerService,
      useValue: {
        sendMail: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, mockMailerServiceProvider],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mockMailerService = module.get(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendConfirmationEmail', () => {
    it('should send confirmation email with correct parameters', async () => {
      // Arrange
      const email = 'test@example.com';
      const code = '123456';
      const expectedMailOptions = {
        to: email,
        subject: 'Подтверждение регистрации',
        text: `Подтвердите регистрацию по ссылке: https://somesite.com/confirm-email?code=${code}`,
        html: `
        <h1>Thank for your registration</h1>
        <p>To finish registration please follow the link below:
            <a href='https://somesite.com/confirm-email?code=${code}'>complete registration</a>
        </p>
      `,
      };

      mockMailerService.sendMail.mockResolvedValue(undefined);

      // Act
      await service.sendConfirmationEmail(email, code);

      // Assert
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expectedMailOptions,
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle mailer service errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const code = '123456';
      const mockError = new Error('Mailer service error');

      mockMailerService.sendMail.mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.sendConfirmationEmail(email, code)).rejects.toThrow(
        'Mailer service error',
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should work with empty code', async () => {
      // Arrange
      const email = 'test@example.com';
      const code = '';
      const expectedMailOptions = {
        to: email,
        subject: 'Подтверждение регистрации',
        text: `Подтвердите регистрацию по ссылке: https://somesite.com/confirm-email?code=${code}`,
        html: `
        <h1>Thank for your registration</h1>
        <p>To finish registration please follow the link below:
            <a href='https://somesite.com/confirm-email?code=${code}'>complete registration</a>
        </p>
      `,
      };

      mockMailerService.sendMail.mockResolvedValue(undefined);

      // Act
      await service.sendConfirmationEmail(email, code);

      // Assert
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expectedMailOptions,
      );
    });
  });

  describe('sendRecoveryEmail', () => {
    it('should send recovery email with correct parameters', async () => {
      // Arrange
      const email = 'test@example.com';
      const recoveryCode = 'recovery123';
      const expectedMailOptions = {
        to: email,
        subject: 'Восстановление пароля',
        text: `Восстановите пароль по ссылке: https://somesite.com/recover?code=${recoveryCode}`,
        html: `
        <h1>Password Recovery</h1>
        <p>To reset your password please follow the link below:
            <a href='https://somesite.com/recover?code=${recoveryCode}'>reset password</a>
        </p>
      `,
      };

      mockMailerService.sendMail.mockResolvedValue(undefined);

      // Act
      await service.sendRecoveryEmail(email, recoveryCode);

      // Assert
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expectedMailOptions,
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle mailer service errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const recoveryCode = 'recovery123';
      const mockError = new Error('Mailer service error');

      mockMailerService.sendMail.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        service.sendRecoveryEmail(email, recoveryCode),
      ).rejects.toThrow('Mailer service error');
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should work with special characters in recovery code', async () => {
      // Arrange
      const email = 'test@example.com';
      const recoveryCode = 'recovery-123_456';
      const expectedMailOptions = {
        to: email,
        subject: 'Восстановление пароля',
        text: `Восстановите пароль по ссылке: https://somesite.com/recover?code=${recoveryCode}`,
        html: `
        <h1>Password Recovery</h1>
        <p>To reset your password please follow the link below:
            <a href='https://somesite.com/recover?code=${recoveryCode}'>reset password</a>
        </p>
      `,
      };

      mockMailerService.sendMail.mockResolvedValue(undefined);

      // Act
      await service.sendRecoveryEmail(email, recoveryCode);

      // Assert
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expectedMailOptions,
      );
    });
  });

  describe('email service integration', () => {
    it('should send both types of emails successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const confirmationCode = 'conf123';
      const recoveryCode = 'rec456';

      mockMailerService.sendMail.mockResolvedValue(undefined);

      // Act
      await service.sendConfirmationEmail(email, confirmationCode);
      await service.sendRecoveryEmail(email, recoveryCode);

      // Assert
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(2);

      // Check first call (confirmation)
      expect(mockMailerService.sendMail).toHaveBeenNthCalledWith(1, {
        to: email,
        subject: 'Подтверждение регистрации',
        text: `Подтвердите регистрацию по ссылке: https://somesite.com/confirm-email?code=${confirmationCode}`,
        html: `
        <h1>Thank for your registration</h1>
        <p>To finish registration please follow the link below:
            <a href='https://somesite.com/confirm-email?code=${confirmationCode}'>complete registration</a>
        </p>
      `,
      });

      // Check second call (recovery)
      expect(mockMailerService.sendMail).toHaveBeenNthCalledWith(2, {
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
    });
  });
});
