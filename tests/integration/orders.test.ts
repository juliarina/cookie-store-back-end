import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createCustomer } from '../helpers.js';

const base = '/api/v1';

const auth = async () => {
  const { email, password } = await createCustomer();
  const login = await request(app).post(`${base}/auth/login`).send({ email, password });
  return {
    email,
    password,
    token: login.body.data.accessToken as string,
    product: (await request(app).get(`${base}/products`).query({ limit: 1 })).body.data[0],
  };
};

const adminAuth = async () => {
  const login = await request(app).post(`${base}/auth/login`).send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return login.body.data.accessToken as string;
};

const checkoutPayload = (email: string) => ({
  name: 'Buyer',
  email,
  phone: '555-0100',
  city: 'Springfield',
  address: '742 Evergreen Terrace',
});

describe('orders', () => {
  describe('POST /orders', () => {
    it('creates an order from the cart, marks paid, and clears the cart', async () => {
      const { email, token, product } = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 2 });

      const stockBefore = product.stock;
      const res = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutPayload(email));

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toMatch(/^CC-/);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.paymentStatus).toBe('PAID');
      expect(res.body.data.items.length).toBe(1);

      const productAfter = await prisma.product.findUnique({ where: { id: product.id } });
      expect(productAfter?.stock).toBe(stockBefore - 2);

      const cart = await request(app).get(`${base}/cart`).set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toEqual([]);
    });

    it('supports guest checkout without a session', async () => {
      const { product } = await auth();
      const res = await request(app).post(`${base}/orders`).send({
        ...checkoutPayload('guest@example.com'),
        items: [{ productId: product.id, quantity: 1 }],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBeNull();
    });

    it('rejects empty cart with 409', async () => {
      const { email, token } = await auth();
      const res = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutPayload(email));
      expect(res.status).toBe(409);
    });

    it('rejects overselling with 409 INSUFFICIENT_STOCK', async () => {
      const { email, token, product } = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });

      // bypass the cart guard: inflate quantity beyond stock directly in the DB
      const cart = await prisma.cart.findFirst({
        where: { user: { email } },
        include: { items: true },
      });
      await prisma.cartItem.update({
        where: { id: cart!.items[0].id },
        data: { quantity: product.stock + 5 },
      });

      const res = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutPayload(email));
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('GET /orders and GET /orders/:id', () => {
    it('lists own orders only', async () => {
      const { email, token, product } = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 });
      const created = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutPayload(email));

      const res = await request(app).get(`${base}/orders`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(created.body.data.id);
    });

    it('rejects viewing another users order (IDOR)', async () => {
      const owner = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ productId: owner.product.id, quantity: 1 });
      const created = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send(checkoutPayload(owner.email));

      const intruder = await auth();
      const res = await request(app)
        .get(`${base}/orders/${created.body.data.id}`)
        .set('Authorization', `Bearer ${intruder.token}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for unknown order', async () => {
      const { token } = await auth();
      const res = await request(app)
        .get(`${base}/orders/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('advances status as admin', async () => {
      const owner = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ productId: owner.product.id, quantity: 1 });
      const created = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send(checkoutPayload(owner.email));

      const res = await request(app)
        .patch(`${base}/orders/${created.body.data.id}/status`)
        .set('Authorization', `Bearer ${await adminAuth()}`)
        .send({ status: 'PROCESSING' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROCESSING');
    });

    it('rejects invalid transitions', async () => {
      const owner = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ productId: owner.product.id, quantity: 1 });
      const created = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send(checkoutPayload(owner.email));

      const res = await request(app)
        .patch(`${base}/orders/${created.body.data.id}/status`)
        .set('Authorization', `Bearer ${await adminAuth()}`)
        .send({ status: 'DELIVERED' });
      expect(res.status).toBe(409);
    });

    it('forbids customers', async () => {
      const owner = await auth();
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ productId: owner.product.id, quantity: 1 });
      const created = await request(app)
        .post(`${base}/orders`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send(checkoutPayload(owner.email));

      const res = await request(app)
        .patch(`${base}/orders/${created.body.data.id}/status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ status: 'CANCELLED' });
      expect(res.status).toBe(403);
    });
  });
});