import { describe, expect, it } from 'vitest';
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
} from '../../src/modules/auth/auth.validation.js';

describe('auth validation', () => {
  describe('registerSchema', () => {
    it('accepts a valid payload', () => {
      const result = registerSchema.safeParse({ email: 'USER@Example.com', password: 'Passw0rd!', name: 'Jane' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe('user@example.com');
    });

    it('rejects weak passwords', () => {
      expect(registerSchema.safeParse({ email: 'a@b.com', password: 'short', name: 'Jane' }).success).toBe(false);
      expect(registerSchema.safeParse({ email: 'a@b.com', password: 'allletters', name: 'Jane' }).success).toBe(false);
      expect(registerSchema.safeParse({ email: 'a@b.com', password: '12345678', name: 'Jane' }).success).toBe(false);
    });

    it('rejects invalid emails', () => {
      expect(registerSchema.safeParse({ email: 'not-an-email', password: 'Passw0rd!', name: 'Jane' }).success).toBe(false);
    });

    it('rejects missing name', () => {
      expect(registerSchema.safeParse({ email: 'a@b.com', password: 'Passw0rd!' }).success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'Passw0rd!' }).success).toBe(true);
    });

    it('rejects empty password', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    });
  });

  describe('updateMeSchema', () => {
    it('accepts partial updates', () => {
      expect(updateMeSchema.safeParse({ name: 'New Name' }).success).toBe(true);
      expect(updateMeSchema.safeParse({ password: 'Passw0rd!' }).success).toBe(true);
    });

    it('rejects an empty update', () => {
      expect(updateMeSchema.safeParse({}).success).toBe(false);
    });
  });
});