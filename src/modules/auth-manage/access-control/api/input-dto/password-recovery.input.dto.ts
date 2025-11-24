import { IsEmail } from 'class-validator';

export class PasswordRecoveryInputDto {
  @IsEmail()
  email: string;
}
