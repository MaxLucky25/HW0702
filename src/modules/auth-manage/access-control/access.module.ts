import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers
import { AuthController } from './api/auth.controller';
import { SecurityController } from '../security-device/api/security.controller';

// Services
import { AuthService } from './application/auth.service';
import { RefreshTokenService } from './application/helping-application/refresh-token.service';
import { JwtConfigService } from './application/helping-application/jwt-config.service';

// Strategies
import { LocalStrategy } from '../guards/local/local.strategy';
import { JwtStrategy } from '../guards/bearer/jwt.strategy';
import { RefreshTokenStrategy } from '../guards/bearer/refresh-token.strategy';

// Guards
import { RefreshTokenAuthGuard } from '../guards/bearer/refresh-token-auth.guard';

// Command Handlers
import { RegistrationUserUseCase } from './application/usecase/register-user.usecase';
import { LoginUserUseCase } from './application/usecase/login-user.usecase';
import { PasswordRecoveryUseCase } from './application/usecase/password-recovery.usecase';
import { NewPasswordUseCase } from './application/usecase/new-password.usecase';
import { RegistrationConfirmationUserUseCase } from './application/usecase/registration-confirmation.usecase';
import { RegistrationEmailResendingUseCase } from './application/usecase/registration-email-resending.usecase';
import { RefreshTokenUseCase } from './application/usecase/refresh-token.usecase';
import { LogoutUserUseCase } from './application/usecase/logout-user.usecase';

// Query Handlers
import { AuthMeQueryUseCase } from './application/query-usecase/auth-me.usecase';

// Modules
import { UsersAccountModule } from '../user-accounts/user-accounts.module';
import { SecurityDeviceModule } from '../security-device/security-device.module';
import { HelpingApplicationModule } from './application/helping-application/helping-application.module';

// Command Handlers
const CommandHandlers = [
  RegistrationUserUseCase,
  LoginUserUseCase,
  PasswordRecoveryUseCase,
  NewPasswordUseCase,
  RegistrationConfirmationUserUseCase,
  RegistrationEmailResendingUseCase,
  RefreshTokenUseCase,
  LogoutUserUseCase,
];

// Query Handlers
const QueryHandlers = [AuthMeQueryUseCase];

// Services
const Services = [AuthService, RefreshTokenService, JwtConfigService];

// Strategies
const Strategies = [LocalStrategy, JwtStrategy, RefreshTokenStrategy];

// Guards
const Guards = [RefreshTokenAuthGuard];

// JWT Service Providers
const JwtServiceProviders = [
  {
    provide: 'ACCESS_JWT_SERVICE',
    useFactory: (jwtConfigService: JwtConfigService) => {
      return jwtConfigService.createAccessJwtService();
    },
    inject: [JwtConfigService],
  },
  {
    provide: 'REFRESH_JWT_SERVICE',
    useFactory: (jwtConfigService: JwtConfigService) => {
      return jwtConfigService.createRefreshJwtService();
    },
    inject: [JwtConfigService],
  },
];

@Module({
  imports: [
    CqrsModule,
    HelpingApplicationModule,
    UsersAccountModule,
    SecurityDeviceModule,
  ],
  controllers: [AuthController, SecurityController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...Services,
    ...Strategies,
    ...Guards,
    ...JwtServiceProviders,
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AccessModule {}
