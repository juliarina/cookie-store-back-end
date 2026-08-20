import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '../../src/modules/orders/order.validation.js';

const validPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234567',
  city: 'Springfield',
  address: '742 Evergreen Terrace',
};

describe('checkout validation', () => {
  it('accepts delivery details only', () => {
    const result = checkoutSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects guest-style items payloads', () => {
    expect(
      checkoutSchema.safeParse({ ...validPayload, items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 }] }).success
    ).toBe(false);
    expect(checkoutSchema.safeParse({ ...validPayload, items: [] }).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(checkoutSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(checkoutSchema.safeParse({ ...validPayload, email: 'nope' }).success).toBe(false);
  });
});