import 'express';

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      signedCookies?: Record<string, string>;
    }

    interface Response {
      cookie(name: string, value: string, options?: any): this;
      clearCookie(name: string, options?: any): this;
    }
  }
}
