import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Создает JWT сервис для access токенов
   * Валидация конфигурации уже выполнена в env.validation.schema.ts
   */
  createAccessJwtService(): JwtService {
    return new JwtService({
      secret: this.configService.get<string>('JWT_SECRET'),
      signOptions: {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      },
    });
  }

  /**
   * Создает JWT сервис для refresh токенов
   * Валидация конфигурации уже выполнена в env.validation.schema.ts
   */
  createRefreshJwtService(): JwtService {
    return new JwtService({
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      signOptions: {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    });
  }
}
