import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  rating: number;
  tag?: string;
  category: string;
};

const products: SeedProduct[] = [
  {
    slug: 'classic-chocolate-chip',
    name: 'Classic Chocolate Chip',
    description: 'Gooey dark chocolate chunks in a soft vanilla-butter base.',
    price: 3.5,
    stock: 40,
    rating: 4.9,
    tag: 'Best seller',
    category: 'Chocolate',
  },
  {
    slug: 'double-fudge',
    name: 'Double Fudge',
    description: 'Deep cocoa cookie loaded with fudgy chocolate pieces.',
    price: 4,
    stock: 12,
    rating: 4.7,
    category: 'Chocolate',
  },
  {
    slug: 'oatmeal-raisin',
    name: 'Oatmeal Raisin',
    description: 'Toasted oats, cinnamon, and plump golden raisins.',
    price: 3.25,
    stock: 6,
    rating: 4.2,
    category: 'Classic',
  },
  {
    slug: 'snickerdoodle',
    name: 'Snickerdoodle',
    description: 'Buttery, chewy, and dusted with cinnamon sugar.',
    price: 3.25,
    stock: 0,
    rating: 4.5,
    category: 'Classic',
  },
  {
    slug: 'peanut-butter',
    name: 'Peanut Butter',
    description: 'Crunchy peanut butter with a classic criss-cross top.',
    price: 3.75,
    stock: 25,
    rating: 4.8,
    tag: 'Best seller',
    category: 'Nut',
  },
  {
    slug: 'red-velvet-white-chip',
    name: 'Red Velvet White Chip',
    description: 'Velvety red cake dough with creamy white chocolate chips.',
    price: 4.25,
    stock: 8,
    rating: 4.6,
    category: 'Chocolate',
  },
  {
    slug: 'mm-celebration',
    name: 'M&M Celebration',
    description: 'Loaded with colorful candy-coated chocolate pieces.',
    price: 3.75,
    stock: 3,
    rating: 4,
    category: 'Classic',
  },
  {
    slug: 'salted-caramel',
    name: 'Salted Caramel',
    description: 'Sweet caramel swirl finished with flaky sea salt.',
    price: 4.5,
    stock: 18,
    rating: 4.7,
    tag: 'New',
    category: 'Classic',
  },
];

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@crumbco.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  const categoryNames = [...new Set(products.map((p) => p.category))];
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }
  const categories = await prisma.category.findMany();

  for (const p of products) {
    const category = categories.find((c) => c.name === p.category);
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        rating: p.rating,
        tag: p.tag ?? null,
        categoryId: category?.id,
        isActive: true,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        rating: p.rating,
        tag: p.tag ?? null,
        categoryId: category?.id,
      },
    });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded ${products.length} products and admin user ${adminEmail}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
