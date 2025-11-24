import { DomainExceptionCode } from '../domain-exception-codes';
import { HttpStatus } from '@nestjs/common';

export function mapDomainCodeToHttpStatus(code: DomainExceptionCode): number {
  switch (code) {
    case DomainExceptionCode.BadRequest:
    case DomainExceptionCode.ValidationError:
    case DomainExceptionCode.ConfirmationCodeExpired:
    case DomainExceptionCode.EmailNotConfirmed:
    case DomainExceptionCode.PasswordRecoveryCodeExpired:
      return HttpStatus.BAD_REQUEST;
    case DomainExceptionCode.Forbidden:
      return HttpStatus.FORBIDDEN;
    case DomainExceptionCode.NotFound:
      return HttpStatus.NOT_FOUND;
    case DomainExceptionCode.Unauthorized:
      return HttpStatus.UNAUTHORIZED;
    case DomainExceptionCode.InternalServerError:
      return HttpStatus.INTERNAL_SERVER_ERROR;
    case DomainExceptionCode.AlreadyExists:
      return HttpStatus.BAD_REQUEST;
    case DomainExceptionCode.AlreadyDeleted:
      return HttpStatus.BAD_REQUEST;
    case DomainExceptionCode.AlreadyConfirmed:
      return HttpStatus.BAD_REQUEST;
    case DomainExceptionCode.ConfirmationCodeInvalid:
      return HttpStatus.BAD_REQUEST;
    case DomainExceptionCode.TooManyRequests:
      return HttpStatus.TOO_MANY_REQUESTS;
    default:
      return HttpStatus.I_AM_A_TEAPOT;
  }
}
