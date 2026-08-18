import { rateLimit } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const globalLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

export const authLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, please try again later' },
  },
});

export const checkoutLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts, please try again later' },
  },
});
