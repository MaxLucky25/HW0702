import { CreateUserInputDto } from '../../api/input-dto/users.input-dto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { UsersRepository } from '../../infrastructure/user.repository';
import { BcryptService } from '../../../access-control/application/helping-application/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { Extension } from '../../../../../core/exceptions/domain-exceptions';

export class CreateUserCommand {
  constructor(public readonly dto: CreateUserInputDto) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserUseCase
  implements ICommandHandler<CreateUserCommand, UserViewDto>
{
  constructor(
    private usersRepository: UsersRepository,
    private bcryptService: BcryptService,
    private configService: ConfigService,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserViewDto> {
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

    // Получаем expiration для EmailConfirmation (EmailConfirmation всегда создается)
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

    // Для админского создания сразу помечаем email как подтвержденный
    const confirmedUser =
      await this.usersRepository.updateUserEmailConfirmed(user);

    return UserViewDto.mapToView(confirmedUser);
  }
}
