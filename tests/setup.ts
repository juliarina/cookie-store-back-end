import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { seedBaseline, truncateAll } from './helpers.js';

beforeEach(async () => {
  await truncateAll();
  await seedBaseline();
});

afterAll(async () => {
  await prisma.$disconnect();
});