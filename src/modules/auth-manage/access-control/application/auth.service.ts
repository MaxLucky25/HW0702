import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../user-accounts/infrastructure/user.repository';
import { UserContextDto } from '../../guards/dto/user-context.dto';
import { BcryptService } from './helping-application/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { LoginInputDto } from '../api/input-dto/login.input.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private bcryptService: BcryptService,
    private configService: ConfigService,
  ) {}

  getExpiration(key: string): number {
    const value = this.configService.get<number>(key);
    if (value === undefined) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: `Config value for ${key} is not set`,
        field: 'ConfigValue',
      });
    }
    return value;
  }

  async validateUser(dto: LoginInputDto): Promise<UserContextDto> {
    const user = await this.usersRepository.findByLoginOrEmail({
      loginOrEmail: dto.loginOrEmail,
    });
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid credentials',
        field: 'loginOrEmail',
      });
    }

    const isPasswordValid = await this.bcryptService.compare({
      password: dto.password,
      hash: user.passwordHash,
    });

    if (!isPasswordValid) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid credentials',
        field: 'Password',
      });
    }

    return { id: user.id };
  }
}
