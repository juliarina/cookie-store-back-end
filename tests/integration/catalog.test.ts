import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createCustomer } from '../helpers.js';

const base = '/api/v1';

const adminToken = async () => {
  const login = await request(app).post(`${base}/auth/login`).send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return login.body.data.accessToken as string;
};

describe('catalog', () => {
  describe('GET /products', () => {
    it('lists all active products with pagination meta', async () => {
      const res = await request(app).get(`${base}/products`).query({ limit: 2 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.pagination.total).toBe(3);
      expect(res.body.meta.pagination.hasNext).toBe(true);
    });

    it('searches by name', async () => {
      const res = await request(app).get(`${base}/products`).query({ search: 'chocolate' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name.toLowerCase()).toContain('chocolate');
    });

    it('filters by price range', async () => {
      const res = await request(app).get(`${base}/products`).query({ minPrice: 3.5, maxPrice: 4 });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('sorts by -rating', async () => {
      const res = await request(app).get(`${base}/products`).query({ sort: '-rating', limit: 100 });
      const ratings = res.body.data.map((p: { rating: number }) => p.rating);
      expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
    });
  });

  describe('GET /products/:slug', () => {
    it('returns product detail', async () => {
      const res = await request(app).get(`${base}/products/classic-chocolate-chip`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Classic Chocolate Chip');
    });

    it('returns 404 for unknown slug', async () => {
      const res = await request(app).get(`${base}/products/nope`);
      expect(res.status).toBe(404);
    });
  });

  describe('admin product CRUD', () => {
    it('creates a product as admin', async () => {
      const res = await request(app)
        .post(`${base}/products`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ name: 'Test Cookie', description: 'A test', price: 2, stock: 10 });
      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('test-cookie');
    });

    it('updates a product', async () => {
      const create = await request(app)
        .post(`${base}/products`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ name: 'Test Cookie', description: 'A test', price: 2, stock: 10 });
      const id = create.body.data.id;

      const res = await request(app)
        .patch(`${base}/products/${id}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ price: 3.25 });
      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(3.25);
    });

    it('soft-deletes a product (removed from public list)', async () => {
      const create = await request(app)
        .post(`${base}/products`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ name: 'Test Cookie', description: 'A test', price: 2, stock: 10 });
      const id = create.body.data.id;

      const del = await request(app)
        .delete(`${base}/products/${id}`)
        .set('Authorization', `Bearer ${await adminToken()}`);
      expect(del.status).toBe(204);

      const listed = await request(app).get(`${base}/products`).query({ limit: 100 });
      expect(listed.body.data.some((p: { slug: string }) => p.slug === 'test-cookie')).toBe(false);
    });

    it('forbids customers from creating products', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const res = await request(app)
        .post(`${base}/products`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({ name: 'X', description: 'Y', price: 1 });
      expect(res.status).toBe(403);
    });
  });

  it('does not expose disabled products', async () => {
    await prisma.product.update({ where: { slug: 'double-fudge' }, data: { isActive: false } });
    const res = await request(app).get(`${base}/products`).query({ limit: 100 });
    expect(res.body.data.some((p: { slug: string }) => p.slug === 'double-fudge')).toBe(false);
  });
});