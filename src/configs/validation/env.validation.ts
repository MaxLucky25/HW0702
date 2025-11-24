import { plainToClass } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { EnvironmentVariables } from './env.validation.schema';
import {
  DomainException,
  Extension,
} from '../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../core/exceptions/domain-exception-codes';

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });

  if (errors.length > 0) {
    // Преобразуем ошибки валидации в extensions для DomainException
    const extensions = errors.map((error: ValidationError) => {
      const constraints = error.constraints;
      let message = 'Validation failed';

      if (constraints) {
        // Берем первое сообщение об ошибке
        message = Object.values(constraints)[0];
      }

      return new Extension(message, error.property);
    });

    throw new DomainException({
      code: DomainExceptionCode.ValidationError,
      message: 'Environment variables validation failed',
      field: 'environment',
      extensions,
    });
  }

  return validatedConfig;
}
