import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserInputDto } from '../../../user-accounts/api/input-dto/users.input-dto';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { Extension } from '../../../../../core/exceptions/domain-exceptions';
import { EmailService } from '../helping-application/email.service';
import { BcryptService } from '../helping-application/bcrypt.service';
import { ConfigService } from '@nestjs/config';

export class RegistrationUserCommand {
  constructor(public readonly dto: CreateUserInputDto) {}
}

@CommandHandler(RegistrationUserCommand)
export class RegistrationUserUseCase
  implements ICommandHandler<RegistrationUserCommand, void>
{
  constructor(
    private usersRepository: UsersRepository,
    private emailService: EmailService,
    private bcryptService: BcryptService,
    private configService: ConfigService,
  ) {}

  async execute(command: RegistrationUserCommand): Promise<void> {
    // Проверяем, что пользователь не существует
    const [byLogin, byEmail] = await Promise.all([
      this.usersRepository.findByLoginOrEmail({
        loginOrEmail: command.dto.login,
      }),
      this.usersRepository.findByLoginOrEmail({
        loginOrEmail: command.dto.email,
      }),
    ]);

    if (byLogin || byEmail) {
      const extensions: Extension[] = [];
      if (byLogin) {
        extensions.push(new Extension('Login already exists', 'login'));
      }
      if (byEmail) {
        extensions.push(new Extension('Email already exists', 'email'));
      }
      throw new DomainException({
        code: DomainExceptionCode.AlreadyExists,
        message: 'Login or Email already exists!',
        field: extensions.length === 1 ? extensions[0].key : '',
        extensions,
      });
    }

    // Хешируем пароль
    const passwordHash = await this.bcryptService.generateHash({
      password: command.dto.password,
    });

    // Получаем expiration для EmailConfirmation
    const expirationMinutes = this.configService.get<number>(
      'EMAIL_CONFIRMATION_EXPIRATION',
    );

    if (!expirationMinutes) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'EMAIL_CONFIRMATION_EXPIRATION is not set',
        field: 'ConfigValue',
      });
    }

    // Создаем пользователя с EmailConfirmation каскадно (одной командой сохранятся обе сущности)
    const user = await this.usersRepository.createUser({
      login: command.dto.login,
      email: command.dto.email,
      passwordHash,
      emailConfirmationExpirationMinutes: expirationMinutes,
    });

    // EmailConfirmation создался каскадно и доступен через user.emailConfirmation
    if (!user.emailConfirmation) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'EmailConfirmation was not created',
        field: 'User',
      });
    }

    // Отправляем email с сгенерированным кодом
    await this.emailService.sendConfirmationEmail(
      user.email,
      user.emailConfirmation.confirmationCode,
    );
  }
}
