import { Injectable, Inject } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { TokenContextDto } from '../dto/token-context.dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { RequestWithCookies } from '../../../../types/express-typed';

interface JwtServiceWithOptions {
  options: {
    secret: string;
  };
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh',
) {
  constructor(@Inject('REFRESH_JWT_SERVICE') jwtService: JwtService) {
    // Получаем secret из настроенного JWT сервиса
    const jwtServiceWithOptions =
      jwtService as unknown as JwtServiceWithOptions;
    const secret = jwtServiceWithOptions.options.secret;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const typedReq = req as RequestWithCookies;
          return typedReq.cookies?.refreshToken ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Валидирует refresh token
   * @param payload - payload из JWT
   * @returns TokenContextDto
   */
  validate(payload: { userId: string; deviceId: string }): TokenContextDto {
    if (!payload || typeof payload !== 'object') {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid refresh token payload',
        field: 'refreshToken',
      });
    }

    if (!payload.userId) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid refresh token payload',
        field: 'refreshToken',
      });
    }

    if (!payload.deviceId) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Device ID is required in refresh token',
        field: 'refreshToken',
      });
    }

    return {
      userId: payload.userId,
      deviceId: payload.deviceId,
    };
  }
}
