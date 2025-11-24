import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';
import {
  loginOrEmailConstraints,
  passwordConstraints,
} from './auth-constraints';

export class LoginInputDto {
  @IsStringWithTrim(
    loginOrEmailConstraints.minLength,
    loginOrEmailConstraints.maxLength,
  )
  loginOrEmail: string;

  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  password: string;
}
