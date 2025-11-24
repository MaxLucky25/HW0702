import { Request, Response } from 'express';

/**
 * Интерфейс для Request с типизированными cookies
 */
export interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
  signedCookies: Record<string, any>;
}

/**
 * Интерфейс для Response с типизированными методами cookie
 */
export interface ResponseWithCookies extends Response {
  cookie(name: string, value: string, options?: any): this;
  clearCookie(name: string, options?: any): this;
}

/**
 * Опции для cookie (упрощенная версия)
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
}
