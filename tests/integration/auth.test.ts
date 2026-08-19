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

  describe('users admin endpoints', () => {
    it('lists users for admin only', async () => {
      await createCustomer();
      const adminLogin = await request(app)
        .post(`${base}/auth/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      const res = await request(app)
        .get(`${base}/users`)
        .set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`);
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
  });
});