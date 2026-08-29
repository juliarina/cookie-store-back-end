import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { resetLoginThrottle } from '../src/lib/loginThrottle.js';
import { seedBaseline, truncateAll } from './helpers.js';

beforeEach(async () => {
  await truncateAll();
  await seedBaseline();
  resetLoginThrottle();
});

afterAll(async () => {
  await prisma.$disconnect();
});