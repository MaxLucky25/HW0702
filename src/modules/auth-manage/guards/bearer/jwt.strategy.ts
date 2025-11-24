import { Injectable, Inject } from '@nestjs/common';
import { UserContextDto } from '../dto/user-context.dto';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

interface JwtServiceWithOptions {
  options: {
    secret: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject('ACCESS_JWT_SERVICE') jwtService: JwtService) {
    // Получаем secret из настроенного JWT сервиса
    const jwtServiceWithOptions =
      jwtService as unknown as JwtServiceWithOptions;
    const secret = jwtServiceWithOptions.options.secret;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * функция принимает payload из jwt токена и возвращает то, что впоследствии будет записано в req.user
   * @param payload
   */
  validate(payload: UserContextDto): Promise<UserContextDto> {
    return Promise.resolve(payload);
  }
}
