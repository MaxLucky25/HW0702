import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { LoginResponseDto } from '../../api/view-dto/login.view-dto';
import { TokenContextDto } from '../../../guards/dto/token-context.dto';
import { SecurityDeviceRepository } from '../../../security-device/infrastructure/security-device.repository';
import { FindByUserAndDeviceDto } from '../../../security-device/infrastructure/dto/session-repo.dto';
import { CreateSessionDomainDto } from '../../../security-device/domain/dto/create-session.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { AuthService } from '../auth.service';
import { RefreshTokenService } from '../helping-application/refresh-token.service';
import { ResponseWithCookies } from '../../../../../types/express-typed';

export class RefreshTokenCommand {
  constructor(
    public readonly user: TokenContextDto,
    public readonly cookies: Record<string, string> | undefined,
    public readonly response: ResponseWithCookies,
  ) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenUseCase
  implements ICommandHandler<RefreshTokenCommand, LoginResponseDto>
{
  constructor(
    @Inject('ACCESS_JWT_SERVICE') private jwtService: JwtService,
    private securityDeviceRepository: SecurityDeviceRepository,
    private authService: AuthService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<LoginResponseDto> {
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

    // Генерируем новые токены
    const newRefreshToken = this.refreshTokenService.generateRefreshToken(
      user.userId,
      session.deviceId, // Используем deviceId из сессии, а не из стратегии
    );

    const newAccessToken = this.jwtService.sign({
      id: user.userId,
    });

    // Получаем новый срок жизни refresh token
    const refreshTokenExpiresIn = this.authService.getExpiration(
      'JWT_REFRESH_EXPIRES_IN',
    );

    // Инвалидируем старую сессию (refresh token rotation)
    session.revoke();
    await this.securityDeviceRepository.save(session);

    // Создаем новую сессию с новым токеном (тот же deviceId)
    const newSessionDto: CreateSessionDomainDto = {
      token: newRefreshToken,
      userId: user.userId,
      deviceId: session.deviceId, // Сохраняем тот же deviceId
      ip: session.ip,
      userAgent: session.userAgent,
      expiresIn: refreshTokenExpiresIn,
    };
    await this.securityDeviceRepository.createSession(newSessionDto);

    // Устанавливаем новый refresh token в cookie
    this.refreshTokenService.setRefreshTokenCookie(response, newRefreshToken);

    return { accessToken: newAccessToken };
  }
}
