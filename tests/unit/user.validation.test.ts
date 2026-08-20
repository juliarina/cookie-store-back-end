import { describe, expect, it } from 'vitest';
import {
  registerAdminSchema,
  updateUserSchema,
} from '../../src/modules/users/user.validation.js';

describe('user validation', () => {
  describe('registerAdminSchema', () => {
    it('accepts a valid payload', () => {
      const result = registerAdminSchema.safeParse({
        email: 'ADMIN@Example.com',
        password: 'Admin123!',
        name: 'Boss',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe('admin@example.com');
    });

    it('rejects weak passwords', () => {
      expect(
        registerAdminSchema.safeParse({ email: 'a@b.com', password: 'short', name: 'Boss' }).success
      ).toBe(false);
      expect(
        registerAdminSchema.safeParse({ email: 'a@b.com', password: 'allletters', name: 'Boss' }).success
      ).toBe(false);
      expect(
        registerAdminSchema.safeParse({ email: 'a@b.com', password: '12345678', name: 'Boss' }).success
      ).toBe(false);
    });

    it('rejects invalid emails and missing name', () => {
      expect(
        registerAdminSchema.safeParse({ email: 'not-an-email', password: 'Admin123!', name: 'Boss' }).success
      ).toBe(false);
      expect(
        registerAdminSchema.safeParse({ email: 'a@b.com', password: 'Admin123!' }).success
      ).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts isActive', () => {
      expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
    });

    it('rejects role changes', () => {
      expect(updateUserSchema.safeParse({ role: 'ADMIN' }).success).toBe(false);
      expect(updateUserSchema.safeParse({ role: 'ADMIN', isActive: true }).success).toBe(false);
    });

    it('rejects an empty body', () => {
      expect(updateUserSchema.safeParse({}).success).toBe(false);
    });
  });
});