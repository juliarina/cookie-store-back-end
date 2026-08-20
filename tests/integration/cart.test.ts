import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createCustomer } from '../helpers.js';

const base = '/api/v1';

const authed = async () => {
  const { email, password } = await createCustomer();
  const login = await request(app).post(`${base}/auth/login`).send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    product: (await request(app).get(`${base}/products`).query({ limit: 1 })).body.data[0],
  };
};

const adminToken = async () => {
  const login = await request(app).post(`${base}/auth/login`).send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return login.body.data.accessToken as string;
};

describe('cart', () => {
  describe('GET /cart', () => {
    it('returns an empty cart with zero totals', async () => {
      const { token, product } = await authed();
      const res = await request(app).get(`${base}/cart`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.subtotal).toBe(0);
      expect(res.body.data.total).toBe(0);
      expect(product).toBeDefined();
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app).get(`${base}/cart`);
      expect(res.status).toBe(401);
    });

    it('rejects admins with 403', async () => {
      const res = await request(app).get(`${base}/cart`).set('Authorization', `Bearer ${await adminToken()}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /cart/items', () => {
    it('adds an item and aggregates quantities', async () => {
      const { token, product } = await authed();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 2 });
      const again = await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 3 });

      expect(again.status).toBe(201);
      const cart = await request(app).get(`${base}/cart`).set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items.length).toBe(1);
      expect(cart.body.data.items[0].quantity).toBe(5);
    });

    it('rejects quantity above stock with 409 INSUFFICIENT_STOCK', async () => {
      const { token, product } = await authed();
      const res = await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: product.stock + 10 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('rejects unknown product with 404', async () => {
      const { token } = await authed();
      const res = await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 });
      expect(res.status).toBe(404);
    });

    it('rejects admins with 403', async () => {
      const { product } = await authed();
      const res = await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ productId: product.id, quantity: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /cart/items/:productId', () => {
    it('updates quantity', async () => {
      const { token, product } = await authed();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });

      const res = await request(app)
        .patch(`${base}/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 4 });
      expect(res.status).toBe(200);
      expect(res.body.data.quantity).toBe(4);
    });

    it('rejects admins with 403', async () => {
      const { product } = await authed();
      const res = await request(app)
        .patch(`${base}/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ quantity: 2 });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /cart/items/:productId', () => {
    it('removes an item and returns 204', async () => {
      const { token, product } = await authed();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });

      const res = await request(app)
        .delete(`${base}/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);

      const cart = await request(app).get(`${base}/cart`).set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toEqual([]);
    });

    it('returns 404 for an item not in the cart', async () => {
      const { token, product } = await authed();
      const res = await request(app)
        .delete(`${base}/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('rejects admins with 403', async () => {
      const { product } = await authed();
      const res = await request(app)
        .delete(`${base}/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${await adminToken()}`);
      expect(res.status).toBe(403);
    });
  });
});