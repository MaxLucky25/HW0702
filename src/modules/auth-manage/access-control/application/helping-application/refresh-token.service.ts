import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { Session } from '../../../security-device/domain/session.entity';
import {
  ResponseWithCookies,
  CookieOptions,
} from '../../../../../types/express-typed';

@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject('REFRESH_JWT_SERVICE') private refreshJwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Генерирует refresh token для пользователя
   * @param userId - ID пользователя
   * @param deviceId - ID устройства (обязательный)
   * @returns refresh token
   */
  generateRefreshToken(userId: string, deviceId: string): string {
    const payload = { userId, deviceId };
    return this.refreshJwtService.sign(payload);
  }

  /**
   * Устанавливает refresh token в httpOnly cookie
   * @param res - Express Response объект
   * @param refreshToken - refresh token для установки
   */
  setRefreshTokenCookie(res: ResponseWithCookies, refreshToken: string): void {
    const maxAge = this.getRefreshTokenMaxAge();

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge,
    };

    res.cookie('refreshToken', refreshToken, cookieOptions);
  }

  /**
   * Валидирует refresh token против сессии в БД
   * @param session - сессия из БД
   * @param refreshTokenFromCookie - токен из cookie
   */
  validateRefreshToken(session: Session, refreshTokenFromCookie: string): void {
    if (!refreshTokenFromCookie) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Refresh token is missing',
        field: 'refreshToken',
      });
    }

    if (session.token !== refreshTokenFromCookie) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid refresh token',
        field: 'refreshToken',
      });
    }
  }

  /**
   * Получает максимальное время жизни refresh token из конфигурации
   * @returns время жизни в миллисекундах
   */
  private getRefreshTokenMaxAge(): number {
    const expiresInMilliseconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    if (!expiresInMilliseconds) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'JWT_REFRESH_EXPIRES_IN is not configured',
        field: 'ConfigValue',
      });
    }
    return expiresInMilliseconds; // уже в миллисекундах
  }
}
