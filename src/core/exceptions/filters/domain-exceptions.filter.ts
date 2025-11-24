import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainException } from '../domain-exceptions';
import { Response } from 'express';
import { mapDomainCodeToHttpStatus } from './map-domain-code-to-http-status';

@Catch(DomainException)
export class DomainHttpExceptionsFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = mapDomainCodeToHttpStatus(exception.code);
    const responseBody = this.buildResponseBody(exception);

    response.status(status).json(responseBody);
  }

  private buildResponseBody(exception: DomainException): {
    errorsMessages: Array<{ message: string; field: string }>;
  } {
    // Если есть массив extensions — возвращаем его (валидация или бизнес-ошибка с несколькими полями)
    if (
      Array.isArray(exception.extensions) &&
      exception.extensions.length > 0
    ) {
      const errorsMessages = exception.extensions.map((ext) => ({
        message: ext.message,
        field: ext.key,
      }));
      return { errorsMessages };
    }

    // Иначе — одна ошибка
    return {
      errorsMessages: [
        {
          message: exception.message,
          field: exception.field,
        },
      ],
    };
  }
}
