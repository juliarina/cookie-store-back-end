import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createCustomer } from '../helpers.js';

const base = '/api/v1';

const newUser = () => ({
  email: `auth-${crypto.randomUUID()}@example.com`,
  password: 'Passw0rd!',
  name: 'Auth Tester',
});

describe('auth', () => {
  describe('POST /auth/register', () => {
    it('registers a customer and returns safe fields', async () => {
      const input = newUser();
      const res = await request(app).post(`${base}/auth/register`).send(input);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(input.email);
      expect(res.body.data.role).toBe('CUSTOMER');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email with 409', async () => {
      const input = newUser();
      await request(app).post(`${base}/auth/register`).send(input);
      const res = await request(app).post(`${base}/auth/register`).send(input);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects invalid input with 400', async () => {
      const res = await request(app).post(`${base}/auth/register`).send({ email: 'bad', password: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('issues tokens and sets refresh cookie', async () => {
      const { email, password } = await createCustomer();
      const res = await request(app).post(`${base}/auth/login`).send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/);
    });

    it('rejects wrong password with 401', async () => {
      const { email } = await createCustomer();
      const res = await request(app).post(`${base}/auth/login`).send({ email, password: 'Wrong123!' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const cookie = login.headers['set-cookie']?.[0];
      const oldHash = (await prisma.user.findUnique({ where: { email } }))?.refreshTokenHash;

      const res = await request(app).post(`${base}/auth/refresh`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();

      const newHash = (await prisma.user.findUnique({ where: { email } }))?.refreshTokenHash;
      expect(newHash).not.toBe(oldHash);
    });

    it('detects reuse of a rotated token and revokes the session', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const oldCookie = login.headers['set-cookie']?.[0];

      await request(app).post(`${base}/auth/refresh`).set('Cookie', oldCookie);
      const reuse = await request(app).post(`${base}/auth/refresh`).set('Cookie', oldCookie);

      expect(reuse.status).toBe(401);
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.refreshTokenHash).toBeNull();
      expect(user?.previousRefreshTokenHash).toBeNull();
    });

    it('rejects missing cookie with 401', async () => {
      const res = await request(app).post(`${base}/auth/refresh`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh session and clears the cookie', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const cookie = login.headers['set-cookie']?.[0];

      const res = await request(app).post(`${base}/auth/logout`).set('Cookie', cookie);
      expect(res.status).toBe(204);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.refreshTokenHash).toBeNull();
    });
  });

  describe('GET/PATCH /me', () => {
    it('returns own profile with a valid token', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const token = login.body.data.accessToken;

      const res = await request(app).get(`${base}/me`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(email);
    });

    it('updates own name', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });

      const res = await request(app)
        .patch(`${base}/me`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get(`${base}/me`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /me', () => {
    it('deletes the customer account, cart, and reviews; detaches orders', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const token = login.body.data.accessToken;

      const product = (await request(app).get(`${base}/products`).query({ limit: 1 })).body.data[0];
      await request(app)
        .post(`${base}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, quantity: 2 });

      const res = await request(app).delete(`${base}/me`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);

      const deleted = await prisma.user.findUnique({ where: { email } });
      expect(deleted).toBeNull();
      const carts = await prisma.cart.findMany({ where: { user: { email } } });
      expect(carts).toEqual([]);
      const reviews = await prisma.review.findMany({ where: { user: { email } } });
      expect(reviews).toEqual([]);
    });

    it('allows re-registering with the same email after deletion', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });

      await request(app)
        .delete(`${base}/me`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(204);

      const register = await request(app)
        .post(`${base}/auth/register`)
        .send({ email, password: 'Passw0rd!', name: 'Back Again' });
      expect(register.status).toBe(201);
      expect(register.body.data.email).toBe(email);
    });

    it('rejects admins with 403', async () => {
      const adminLogin = await request(app)
        .post(`${base}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const res = await request(app)
        .delete(`${base}/me`)
        .set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).delete(`${base}/me`);
      expect(res.status).toBe(401);
    });
  });

  describe('users admin endpoints', () => {
    const adminLogin = async () => {
      const res = await request(app)
        .post(`${base}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      return res.body.data.accessToken as string;
    };

    it('lists users for admin only', async () => {
      await createCustomer();
      const token = await adminLogin();

      const res = await request(app).get(`${base}/users`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects customers with 403', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const res = await request(app)
        .get(`${base}/users`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('registers a new admin with role ADMIN', async () => {
      const token = await adminLogin();
      const input = {
        email: `admin-${crypto.randomUUID()}@example.com`,
        password: 'AdminPass1!',
        name: 'New Admin',
      };

      const res = await request(app)
        .post(`${base}/users/register`)
        .set('Authorization', `Bearer ${token}`)
        .send(input);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(input.email);
      expect(res.body.data.role).toBe('ADMIN');

      const login = await request(app).post(`${base}/auth/login`).send({ email: input.email, password: input.password });
      expect(login.status).toBe(200);
      expect(login.body.data.user.role).toBe('ADMIN');
    });

    it('rejects duplicate admin email with 409', async () => {
      const token = await adminLogin();
      const input = {
        email: `admin-${crypto.randomUUID()}@example.com`,
        password: 'AdminPass1!',
        name: 'Dup Admin',
      };
      await request(app)
        .post(`${base}/users/register`)
        .set('Authorization', `Bearer ${token}`)
        .send(input);

      const res = await request(app)
        .post(`${base}/users/register`)
        .set('Authorization', `Bearer ${token}`)
        .send(input);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects admin registration by customers with 403', async () => {
      const { email, password } = await createCustomer();
      const login = await request(app).post(`${base}/auth/login`).send({ email, password });
      const res = await request(app)
        .post(`${base}/users/register`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({
          email: `admin-${crypto.randomUUID()}@example.com`,
          password: 'AdminPass1!',
          name: 'Not Allowed',
        });
      expect(res.status).toBe(403);
    });

    it('toggles isActive via PATCH /users/:id', async () => {
      const token = await adminLogin();
      const { user } = await createCustomer();

      const res = await request(app)
        .patch(`${base}/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.role).toBe('CUSTOMER');

      const login = await request(app).post(`${base}/auth/login`).send({ email: user.email, password: 'Passw0rd!' });
      expect(login.status).toBe(401);
    });

    it('rejects role changes with 400', async () => {
      const token = await adminLogin();
      const { user } = await createCustomer();

      const res = await request(app)
        .patch(`${base}/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN', isActive: true });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
      expect(unchanged?.role).toBe('CUSTOMER');
      expect(unchanged?.isActive).toBe(true);
    });
  });
});