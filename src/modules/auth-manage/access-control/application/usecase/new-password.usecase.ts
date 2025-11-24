import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NewPasswordInputDto } from '../../api/input-dto/new-password.input.dto';
import { BcryptService } from '../helping-application/bcrypt.service';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';
import { PasswordRecoveryRepository } from '../../../user-accounts/infrastructure/password-recovery.repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class NewPasswordCommand {
  constructor(public readonly dto: NewPasswordInputDto) {}
}

@CommandHandler(NewPasswordCommand)
export class NewPasswordUseCase
  implements ICommandHandler<NewPasswordCommand, void>
{
  constructor(
    private usersRepository: UsersRepository,
    private passwordRecoveryRepository: PasswordRecoveryRepository,
    private bcryptService: BcryptService,
  ) {}

  async execute(command: NewPasswordCommand): Promise<void> {
    const passwordRecovery =
      await this.passwordRecoveryRepository.findByRecoveryCode({
        recoveryCode: command.dto.recoveryCode,
      });

    // Проверяем, что passwordRecovery существует и валиден
    if (!passwordRecovery || !passwordRecovery.isValid()) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeInvalid,
        message: 'Recovery code is not valid',
        field: 'recoveryCode',
      });
    }

    // Получаем пользователя для обновления пароля
    const user = await this.usersRepository.findById({
      id: passwordRecovery.userId,
    });

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found!',
        field: 'User',
      });
    }

    const newPasswordHash = await this.bcryptService.generateHash({
      password: command.dto.newPassword,
    });

    // Обновляем пароль через умную сущность
    await this.usersRepository.updateUserPassword(user, newPasswordHash);

    // Подтверждаем recovery код через умную сущность
    await this.passwordRecoveryRepository.confirmPasswordRecovery(
      passwordRecovery,
    );

    return;
  }
}
