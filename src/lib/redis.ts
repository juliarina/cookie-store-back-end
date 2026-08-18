import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis: Redis | null = env.REDIS_ENABLED
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })
  : null;

if (redis) {
  redis.on('error', (err) => {
    logger.warn('Redis connection error', { message: err.message });
  });
}
