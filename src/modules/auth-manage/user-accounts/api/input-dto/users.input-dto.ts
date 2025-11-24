import { IsEmail, IsString } from 'class-validator';
import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';
import { loginConstraints, passwordConstraints } from './user-constraints';
import { Trim } from '../../../../../core/decorators/transform/trim';

export class CreateUserInputDto {
  @IsStringWithTrim(loginConstraints.minLength, loginConstraints.maxLength)
  login: string;

  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  password: string;

  @IsString()
  @Trim()
  @IsEmail()
  email: string;
}
