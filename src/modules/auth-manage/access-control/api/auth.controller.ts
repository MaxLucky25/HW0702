import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseWithCookies } from '../../../../types/express-typed';
import { MeViewDto } from '../../user-accounts/api/view-dto/users.view-dto';
import { CreateUserInputDto } from '../../user-accounts/api/input-dto/users.input-dto';
import { LocalAuthGuard } from '../../guards/local/local-auth.guard';
import { JwtAuthGuard } from '../../guards/bearer/jwt-auth-guard';
import { RefreshTokenAuthGuard } from '../../guards/bearer/refresh-token-auth.guard';
import { UserContextDto } from '../../guards/dto/user-context.dto';
import { TokenContextDto } from '../../guards/dto/token-context.dto';
import { Cookies } from '../../guards/decorators/param/cookies.decorator';
import { PasswordRecoveryInputDto } from './input-dto/password-recovery.input.dto';
import { NewPasswordInputDto } from './input-dto/new-password.input.dto';
import { RegistrationConfirmationInputDto } from './input-dto/registration-confirmation.input.dto';
import { RegistrationEmailResendingInputDto } from './input-dto/registration-email-resending.input.dto';
import { LoginInputDto } from './input-dto/login.input.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegistrationUserCommand } from '../application/usecase/register-user.usecase';
import { LoginUserCommand } from '../application/usecase/login-user.usecase';
import { LoginResponseDto } from './view-dto/login.view-dto';
import { PasswordRecoveryCommand } from '../application/usecase/password-recovery.usecase';
import { NewPasswordCommand } from '../application/usecase/new-password.usecase';
import { RegistrationConfirmationCommand } from '../application/usecase/registration-confirmation.usecase';
import { RegistrationEmailResendingCommand } from '../application/usecase/registration-email-resending.usecase';
import { AuthMeQuery } from '../application/query-usecase/auth-me.usecase';
import { RefreshTokenCommand } from '../application/usecase/refresh-token.usecase';
import { LogoutUserCommand } from '../application/usecase/logout-user.usecase';
import { ExtractUserForJwtGuard } from '../../guards/decorators/param/extract-user-for-jwt-guard.decorator';
import { ExtractUserForRefreshTokenGuard } from '../../guards/decorators/param/extract-user-for-refresh-token-guard.decorator';
import { ExtractIp } from '../../guards/decorators/param/extract-ip.decorator';
import { ExtractUserAgent } from '../../guards/decorators/param/extract-user-agent.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post('registration')
  @HttpCode(204)
  registration(@Body() body: CreateUserInputDto): Promise<void> {
    return this.commandBus.execute(new RegistrationUserCommand(body));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(
    @Body() body: LoginInputDto,
    @ExtractIp() ip: string,
    @ExtractUserAgent() userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    return this.commandBus.execute(
      new LoginUserCommand(body, ip, userAgent, res),
    );
  }

  @Post('password-recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwordRecovery(
    @Body() body: PasswordRecoveryInputDto,
  ): Promise<void> {
    await this.commandBus.execute(new PasswordRecoveryCommand(body));
  }

  @Post('new-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async newPassword(@Body() body: NewPasswordInputDto): Promise<void> {
    await this.commandBus.execute(new NewPasswordCommand(body));
  }

  @Post('registration-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrationConfirmation(
    @Body() body: RegistrationConfirmationInputDto,
  ): Promise<void> {
    await this.commandBus.execute(new RegistrationConfirmationCommand(body));
  }

  @Post('registration-email-resending')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrationEmailResending(
    @Body() body: RegistrationEmailResendingInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new RegistrationEmailResendingCommand(body));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@ExtractUserForJwtGuard() user: UserContextDto): Promise<MeViewDto> {
    return this.queryBus.execute(new AuthMeQuery(user));
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenAuthGuard)
  async refreshToken(
    @ExtractUserForRefreshTokenGuard() user: TokenContextDto,
    @Cookies() cookies: Record<string, string> | undefined,
    @Res({ passthrough: true }) res: ResponseWithCookies,
  ): Promise<LoginResponseDto> {
    return this.commandBus.execute(new RefreshTokenCommand(user, cookies, res));
  }

  @Post('logout')
  @UseGuards(RefreshTokenAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @ExtractUserForRefreshTokenGuard() user: TokenContextDto,
    @Cookies() cookies: Record<string, string> | undefined,
    @Res({ passthrough: true }) res: ResponseWithCookies,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutUserCommand(user, cookies, res));
  }
}
