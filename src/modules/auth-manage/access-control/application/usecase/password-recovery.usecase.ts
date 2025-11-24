import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PasswordRecoveryInputDto } from '../../api/input-dto/password-recovery.input.dto';
import { AuthService } from '../auth.service';
import { EmailService } from '../helping-application/email.service';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';
import { PasswordRecoveryRepository } from '../../../user-accounts/infrastructure/password-recovery.repository';

export class PasswordRecoveryCommand {
  constructor(public readonly dto: PasswordRecoveryInputDto) {}
}

@CommandHandler(PasswordRecoveryCommand)
export class PasswordRecoveryUseCase
  implements ICommandHandler<PasswordRecoveryCommand, void>
{
  constructor(
    private usersRepository: UsersRepository,
    private passwordRecoveryRepository: PasswordRecoveryRepository,
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  async execute(command: PasswordRecoveryCommand): Promise<void> {
    const user = await this.usersRepository.findByEmail({
      email: command.dto.email,
    });
    if (user) {
      const expiration = this.authService.getExpiration(
        'PASSWORD_RECOVERY_EXPIRATION',
      );

      // Создаем или регенерируем recovery код через умную сущность
      const passwordRecovery =
        await this.passwordRecoveryRepository.createOrRegenerate(
          user.id,
          expiration,
        );

      // Отправляем email с новым кодом
      await this.emailService.sendRecoveryEmail(
        user.email,
        passwordRecovery.recoveryCode,
      );
    }
    return;
  }
}
