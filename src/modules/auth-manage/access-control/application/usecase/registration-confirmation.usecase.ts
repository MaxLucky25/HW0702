import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegistrationConfirmationInputDto } from '../../api/input-dto/registration-confirmation.input.dto';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';
import { EmailConfirmationRepository } from '../../../user-accounts/infrastructure/email-confirmation.repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class RegistrationConfirmationCommand {
  constructor(public readonly dto: RegistrationConfirmationInputDto) {}
}

@CommandHandler(RegistrationConfirmationCommand)
export class RegistrationConfirmationUserUseCase
  implements ICommandHandler<RegistrationConfirmationCommand, void>
{
  constructor(
    private usersRepository: UsersRepository,
    private emailConfirmationRepository: EmailConfirmationRepository,
  ) {}

  async execute(command: RegistrationConfirmationCommand): Promise<void> {
    const emailConfirmation =
      await this.emailConfirmationRepository.findByConfirmationCode({
        confirmationCode: command.dto.code,
      });

    // Проверяем, что emailConfirmation существует и валиден
    if (!emailConfirmation || !emailConfirmation.isValid()) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeInvalid,
        message: 'Confirmation code is not valid',
        field: 'code',
      });
    }

    // Получаем пользователя для проверки статуса
    const user = await this.usersRepository.findById({
      id: emailConfirmation.userId,
    });
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeInvalid,
        message: 'Confirmation code is not valid',
        field: 'code',
      });
    }

    // Проверяем, что пользователь уже подтвержден
    if (user.hasEmailConfirmed()) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeInvalid,
        message: 'Confirmation code is not valid',
        field: 'code',
      });
    }

    // Обновляем статус подтверждения пользователя
    await this.usersRepository.updateUserEmailConfirmed(user);

    // Подтверждаем код через умную сущность
    await this.emailConfirmationRepository.confirmEmailConfirmation(
      emailConfirmation,
    );

    return;
  }
}
