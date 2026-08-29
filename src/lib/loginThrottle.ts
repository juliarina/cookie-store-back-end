import { env } from '../config/env.js';
import { redis } from './redis.js';

const PREFIX = 'login:fail:';

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();

const keyFor = (email: string): string => `${PREFIX}${email.trim().toLowerCase()}`;

const ttlSeconds = (): number => Math.max(1, Math.ceil(env.AUTH_FAIL_WINDOW_MS / 1000));

export const isLoginLocked = async (email: string): Promise<boolean> => {
  const key = keyFor(email);
  if (redis) {
    const count = Number((await redis.get(key)) ?? '0');
    return count >= env.AUTH_MAX_FAILED_ATTEMPTS;
  }

  const entry = memory.get(key);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return false;
  }
  return entry.count >= env.AUTH_MAX_FAILED_ATTEMPTS;
};

export const recordFailedLogin = async (email: string): Promise<boolean> => {
  const key = keyFor(email);
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds());
    return count >= env.AUTH_MAX_FAILED_ATTEMPTS;
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.expiresAt <= now) {
    memory.set(key, { count: 1, expiresAt: now + env.AUTH_FAIL_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count >= env.AUTH_MAX_FAILED_ATTEMPTS;
};

export const clearFailedLogins = async (email: string): Promise<void> => {
  const key = keyFor(email);
  if (redis) {
    await redis.del(key);
    return;
  }
  memory.delete(key);
};

export const resetLoginThrottle = (): void => {
  memory.clear();
};