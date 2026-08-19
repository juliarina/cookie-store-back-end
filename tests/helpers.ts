import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

export const TABLES = [
  'OrderItem',
  'Order',
  'CartItem',
  'Cart',
  'Review',
  'Product',
  'Category',
  'User',
] as const;

export const truncateAll = async (client: PrismaClient = prisma): Promise<void> => {
  await client.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
  );
};

export interface BaselineProduct {
  slug: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export const seedBaseline = async (client: PrismaClient = prisma): Promise<void> => {
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  await client.user.create({
    data: {
      email: 'admin@crumbco.dev',
      passwordHash: adminPasswordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  const products: BaselineProduct[] = [
    { slug: 'classic-chocolate-chip', name: 'Classic Chocolate Chip', price: 3.5, stock: 40, category: 'Chocolate' },
    { slug: 'double-fudge', name: 'Double Fudge', price: 4, stock: 12, category: 'Chocolate' },
    { slug: 'oatmeal-raisin', name: 'Oatmeal Raisin', price: 3.25, stock: 6, category: 'Classic' },
  ];

  for (const p of products) {
    const category = await client.category.upsert({
      where: { slug: p.category.toLowerCase() },
      update: {},
      create: { name: p.category, slug: p.category.toLowerCase() },
    });
    await client.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: `${p.name} description`,
        price: p.price,
        stock: p.stock,
        rating: 4,
        categoryId: category.id,
      },
    });
  }
};

export const createCustomer = async (client: PrismaClient = prisma) => {
  const email = `customer-${crypto.randomUUID()}@example.com`;
  const passwordHash = await bcrypt.hash('Passw0rd!', 12);
  const user = await client.user.create({
    data: { email, passwordHash, name: 'Customer', role: 'CUSTOMER' },
  });
  return { user, email, password: 'Passw0rd!' };
};

export const ADMIN_EMAIL = 'admin@crumbco.dev';
export const ADMIN_PASSWORD = 'Admin123!';