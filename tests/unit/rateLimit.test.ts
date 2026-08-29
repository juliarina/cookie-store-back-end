import { describe, expect, it } from 'vitest';
import type { Options } from 'express-rate-limit';
import {
  authLimitConfig,
  checkoutLimitConfig,
  globalLimitConfig,
  refreshLimitConfig,
} from '../../src/middleware/rateLimit.js';

const countsRequest = (config: Partial<Options>, statusCode: number): boolean => {
  const wasSuccessful = statusCode < 400;
  if (config.skipSuccessfulRequests) return !wasSuccessful;
  if (config.skipFailedRequests) return wasSuccessful;
  return true;
};

describe('rateLimit configs', () => {
  it('auth limiter allows 5 attempts and counts only failures', () => {
    expect(authLimitConfig.limit).toBe(5);
    expect(authLimitConfig.skipSuccessfulRequests).toBe(true);
    expect(authLimitConfig.windowMs).toBe(60 * 1000);
    expect(countsRequest(authLimitConfig, 200)).toBe(false);
    expect(countsRequest(authLimitConfig, 401)).toBe(true);
    expect(countsRequest(authLimitConfig, 429)).toBe(true);
  });

  it('refresh limiter allows 30 attempts and counts only failures', () => {
    expect(refreshLimitConfig.limit).toBe(30);
    expect(refreshLimitConfig.skipSuccessfulRequests).toBe(true);
    expect(countsRequest(refreshLimitConfig, 200)).toBe(false);
    expect(countsRequest(refreshLimitConfig, 401)).toBe(true);
  });

  it('global and checkout limiters count every request', () => {
    expect(globalLimitConfig.skipSuccessfulRequests).toBeUndefined();
    expect(globalLimitConfig.skipFailedRequests).toBeUndefined();
    expect(checkoutLimitConfig.limit).toBe(10);
    expect(checkoutLimitConfig.skipSuccessfulRequests).toBeUndefined();
    expect(countsRequest(globalLimitConfig, 200)).toBe(true);
    expect(countsRequest(globalLimitConfig, 500)).toBe(true);
    expect(countsRequest(checkoutLimitConfig, 200)).toBe(true);
  });

  it('classifies success by status code < 400 (express-rate-limit default)', () => {
    expect(authLimitConfig.requestWasSuccessful).toBeUndefined();
    expect(refreshLimitConfig.requestWasSuccessful).toBeUndefined();
  });
});