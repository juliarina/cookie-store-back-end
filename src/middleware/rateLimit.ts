import { rateLimit } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const globalLimitConfig: Partial<Options> = {
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
};

export const authLimitConfig: Partial<Options> = {
  ...shared,
  windowMs: 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, please try again later' },
  },
};

export const refreshLimitConfig: Partial<Options> = {
  ...shared,
  windowMs: 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts, please try again later' },
  },
};

export const checkoutLimitConfig: Partial<Options> = {
  ...shared,
  windowMs: 60 * 1000,
  limit: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts, please try again later' },
  },
};

const bypass: RequestHandler = (_req, _res, next) => next();

const withBypass = (config: Partial<Options>): RequestHandler =>
  env.NODE_ENV === 'test' ? bypass : rateLimit(config);

export const globalLimiter: RequestHandler = withBypass(globalLimitConfig);
export const authLimiter: RequestHandler = withBypass(authLimitConfig);
export const refreshLimiter: RequestHandler = withBypass(refreshLimitConfig);
export const checkoutLimiter: RequestHandler = withBypass(checkoutLimitConfig);