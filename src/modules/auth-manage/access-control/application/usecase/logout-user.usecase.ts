import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TokenContextDto } from '../../../guards/dto/token-context.dto';
import { SecurityDeviceRepository } from '../../../security-device/infrastructure/security-device.repository';
import { FindByUserAndDeviceDto } from '../../../security-device/infrastructure/dto/session-repo.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { RefreshTokenService } from '../helping-application/refresh-token.service';
import { ResponseWithCookies } from '../../../../../types/express-typed';

export class LogoutUserCommand {
  constructor(
    public readonly user: TokenContextDto,
    public readonly cookies: Record<string, string> | undefined,
    public readonly response: ResponseWithCookies,
  ) {}
}

@CommandHandler(LogoutUserCommand)
export class LogoutUserUseCase
  implements ICommandHandler<LogoutUserCommand, void>
{
  constructor(
    private securityDeviceRepository: SecurityDeviceRepository,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(command: LogoutUserCommand): Promise<void> {
    const { user, cookies, response } = command;

    // Ищем сессию в БД по userId + deviceId
    const sessionDto: FindByUserAndDeviceDto = {
      userId: user.userId,
      deviceId: user.deviceId,
    };
    const session =
      await this.securityDeviceRepository.findByUserAndDevice(sessionDto);

    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Session not found',
        field: 'refreshToken',
      });
    }

    // Валидируем refresh token против сессии в БД
    const refreshTokenFromCookie = cookies?.refreshToken;
    if (!refreshTokenFromCookie) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Refresh token not found in cookies',
        field: 'refreshToken',
      });
    }
    this.refreshTokenService.validateRefreshToken(
      session,
      refreshTokenFromCookie,
    );

    // Отзываем сессию
    session.revoke();
    await this.securityDeviceRepository.save(session);

    // Очищаем refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
}
