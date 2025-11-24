import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithCookies } from '../../../../../types/express-typed';

export const Cookies = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): Record<string, string> | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithCookies>();
    return req.cookies;
  },
);
