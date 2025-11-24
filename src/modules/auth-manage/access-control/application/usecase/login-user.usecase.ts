import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth.service';
import { LoginInputDto } from '../../api/input-dto/login.input.dto';
import { LoginResponseDto } from '../../api/view-dto/login.view-dto';
import { SecurityDeviceRepository } from '../../../security-device/infrastructure/security-device.repository';
import { CreateSessionDomainDto } from '../../../security-device/domain/dto/create-session.domain.dto';
import { FindByUserIdDto } from '../../../security-device/infrastructure/dto/session-repo.dto';
import { RefreshTokenService } from '../helping-application/refresh-token.service';

export class LoginUserCommand {
  constructor(
    public readonly dto: LoginInputDto,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly response: Response,
  ) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserUseCase
  implements ICommandHandler<LoginUserCommand, LoginResponseDto>
{
  constructor(
    private authService: AuthService,
    @Inject('ACCESS_JWT_SERVICE') private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private securityDeviceRepository: SecurityDeviceRepository,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginResponseDto> {
    const userContext = await this.authService.validateUser(command.dto);

    // Получаем срок жизни refresh token из конфигурации
    const refreshTokenExpiresIn = this.authService.getExpiration(
      'JWT_REFRESH_EXPIRES_IN',
    );

    // Ищем существующую активную сессию с таким же браузером для этого пользователя
    const existingSessions = await this.securityDeviceRepository.findByUserId({
      userId: userContext.id,
    } as FindByUserIdDto);
    const existingSession = existingSessions?.find((session) => {
      return session.userAgent === command.userAgent && session.isActive();
    });

    let deviceId: string;
    let refreshToken: string;

    if (existingSession) {
      // Если сессия существует - переиспользуем deviceId и обновляем сессию
      deviceId = existingSession.deviceId;
      refreshToken = this.refreshTokenService.generateRefreshToken(
        userContext.id,
        deviceId,
      );

      // Обновляем существующую сессию
      existingSession.updateToken(refreshToken);
      existingSession.updateLastActiveDate();
      existingSession.updateExpiresAt(refreshTokenExpiresIn);
      await this.securityDeviceRepository.save(existingSession);
    } else {
      // Если сессии нет - создаем новую
      deviceId = randomUUID() as string;
      refreshToken = this.refreshTokenService.generateRefreshToken(
        userContext.id,
        deviceId,
      );

      // Создаем новую сессию в БД
      const sessionDto: CreateSessionDomainDto = {
        token: refreshToken,
        userId: userContext.id,
        deviceId,
        ip: command.ip,
        userAgent: command.userAgent,
        expiresIn: refreshTokenExpiresIn,
      };

      await this.securityDeviceRepository.createSession(sessionDto);
    }

    // Устанавливаем refresh token в cookie
    this.refreshTokenService.setRefreshTokenCookie(
      command.response,
      refreshToken,
    );

    // Генерируем access token с минимальным payload
    const accessToken = this.jwtService.sign({ id: userContext.id });

    return { accessToken };
  }
}
