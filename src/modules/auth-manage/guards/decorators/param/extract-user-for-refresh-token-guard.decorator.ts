import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TokenContextDto } from '../../dto/token-context.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export const ExtractUserForRefreshTokenGuard = createParamDecorator(
  (data: unknown, context: ExecutionContext): TokenContextDto => {
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as TokenContextDto | undefined;

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'User is not authorized',
        field: 'User',
      });
    }

    return user;
  },
);
