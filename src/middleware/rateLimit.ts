import { rateLimit } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

const bypass: RequestHandler = (_req, _res, next) => next();

export const globalLimiter: RequestHandler = env.NODE_ENV === 'test'
  ? bypass
  : rateLimit({
      ...shared,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      },
    });

export const authLimiter: RequestHandler = env.NODE_ENV === 'test'
  ? bypass
  : rateLimit({
      ...shared,
      windowMs: 60 * 1000,
      limit: 5,
      skipSuccessfulRequests: true,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, please try again later' },
      },
    });

export const refreshLimiter: RequestHandler = env.NODE_ENV === 'test'
  ? bypass
  : rateLimit({
      ...shared,
      windowMs: 60 * 1000,
      limit: 30,
      skipSuccessfulRequests: true,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts, please try again later' },
      },
    });

export const checkoutLimiter: RequestHandler = env.NODE_ENV === 'test'
  ? bypass
  : rateLimit({
      ...shared,
      windowMs: 60 * 1000,
      limit: 10,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts, please try again later' },
      },
    });
