import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../../src/modules/auth/token.service.js';
import { env } from '../../src/config/env.js';

describe('token.service', () => {
  describe('generateAccessToken', () => {
    it('produces a JWT with expected claims', () => {
      const token = generateAccessToken('user-123', 'CUSTOMER');
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe('CUSTOMER');
      expect(payload.type).toBe('access');
    });

    it('expires according to configured TTL', () => {
      const token = generateAccessToken('user-123', 'ADMIN');
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
      expect(payload.exp).toBeDefined();
      expect((payload.exp as number) - (payload.iat as number)).toBeGreaterThan(0);
    });
  });

  describe('refresh tokens', () => {
    it('generates unique opaque tokens', () => {
      const a = generateRefreshToken();
      const b = generateRefreshToken();
      expect(a).not.toBe(b);
      expect(a.length).toBe(64);
    });

    it('hashes deterministically and irreversibly', () => {
      const token = generateRefreshToken();
      expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
      expect(hashRefreshToken(token)).not.toContain(token);
      expect(hashRefreshToken(token)).not.toBe(token);
    });
  });
});