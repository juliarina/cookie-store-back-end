import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { CreateCategoryInput } from './category.validation.js';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const listCategories = () =>
  prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

export const createCategory = async (input: CreateCategoryInput) => {
  const slug = input.slug ?? slugify(input.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) throw ApiError.conflict('A category with this slug already exists');

  return prisma.category.create({ data: { name: input.name, slug } });
};