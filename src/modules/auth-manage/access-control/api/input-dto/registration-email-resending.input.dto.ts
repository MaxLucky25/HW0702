import { IsEmail } from 'class-validator';

export class RegistrationEmailResendingInputDto {
  @IsEmail()
  email: string;
}
