import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';
import { confirmationCodeConstrains } from './auth-constraints';

export class RegistrationConfirmationInputDto {
  @IsStringWithTrim(
    confirmationCodeConstrains.minLength,
    confirmationCodeConstrains.maxLength,
  )
  code: string;
}
