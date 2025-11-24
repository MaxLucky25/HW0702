import {
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import {
  DomainException,
  Extension,
} from '../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../core/exceptions/domain-exception-codes';

//функция использует рекурсию для обхода объекта children при вложенных полях при валидации
export const errorFormatter = (
  errors: ValidationError[],
  errorMessage: Extension[] = [],
): Extension[] => {
  // Инициализируем массив для результатов (или используем переданный)
  const errorsForResponse = errorMessage || [];
  for (const error of errors) {
    // Случай 1: Есть вложенные ошибки (children)
    if (!error.constraints && error.children?.length) {
      errorFormatter(error.children, errorsForResponse);
    }
    // Случай 2: Есть стандартные ограничения (constraints)
    else if (error.constraints) {
      const constrainKeys = Object.keys(error.constraints);
      for (const key of constrainKeys) {
        const message = error.constraints[key]
          ? `${error.constraints[key]}; Received value: ${error?.value}`
          : '';
        errorsForResponse.push({
          message,
          key: error.property,
        });
      }
    }
  }
  return errorsForResponse;
};

export function pipesSetup(app: INestApplication) {
  //Глобальный пайп для валидации входящих данных.
  // ObjectIdValidationTransformationPipe теперь доступен глобально через CoreModule
  app.useGlobalPipes(
    new ValidationPipe({
      //class-transformer создает экземпляр dto
      //соответственно применятся значения по-умолчанию
      //и методы классов dto
      transform: true,
      //Выдавать первую ошибку для каждого поля
      stopAtFirstError: true,
      //Для преобразования ошибок класс валидатора в необходимый вид
      exceptionFactory: (errors) => {
        const formattedErrors = errorFormatter(errors);

        throw new DomainException({
          code: DomainExceptionCode.ValidationError,
          message: 'Validation failed',
          field: 'validationError',
          extensions: formattedErrors,
        });
      },
    }),
  );
}
