import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegistrationEmailResendingInputDto } from '../../api/input-dto/registration-email-resending.input.dto';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';
import { EmailConfirmationRepository } from '../../../user-accounts/infrastructure/email-confirmation.repository';
import { EmailService } from '../helping-application/email.service';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { AuthService } from '../auth.service';

export class RegistrationEmailResendingCommand {
  constructor(public readonly dto: RegistrationEmailResendingInputDto) {}
}

@CommandHandler(RegistrationEmailResendingCommand)
export class RegistrationEmailResendingUseCase
  implements ICommandHandler<RegistrationEmailResendingCommand, void>
{
  constructor(
    private usersRepository: UsersRepository,
    private emailConfirmationRepository: EmailConfirmationRepository,
    private emailService: EmailService,
    private authService: AuthService,
  ) {}

  async execute(command: RegistrationEmailResendingCommand): Promise<void> {
    const user = await this.usersRepository.findByEmail({
      email: command.dto.email,
    });

    if (!user || user.hasEmailConfirmed()) {
      throw new DomainException({
        code: DomainExceptionCode.AlreadyConfirmed,
        message: 'Email already confirmed',
        field: 'email',
      });
    }

    const expiration = this.authService.getExpiration(
      'EMAIL_CONFIRMATION_EXPIRATION',
    );

    // Создаем или регенерируем код подтверждения через умную сущность
    const emailConfirmation =
      await this.emailConfirmationRepository.createOrRegenerate(
        user.id,
        expiration,
      );

    // Отправляем email с новым кодом
    await this.emailService.sendConfirmationEmail(
      user.email,
      emailConfirmation.confirmationCode,
    );

    return;
  }
}
