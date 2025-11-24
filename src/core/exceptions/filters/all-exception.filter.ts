import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseBody } from './error-response-body.type';
import { isErrorWithMessage } from './is-error-with-message';
import { ThrottlerException } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isThrottler = exception instanceof ThrottlerException;
    const status = isThrottler
      ? HttpStatus.TOO_MANY_REQUESTS
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const message =
      isThrottler || !isProd
        ? isErrorWithMessage(exception)
          ? exception.message
          : 'Unknown exception occurred.'
        : 'Internal server error'; // скрытое сообщение в проде

    const responseBody = this.buildResponseBody(message);

    response.status(status).json(responseBody);
  }

  private buildResponseBody(message: string): ErrorResponseBody {
    return {
      errorsMessages: [
        {
          message,
          field: ' We are working to fix this issue. Please try again later.',
        },
      ],
    };
  }
}
