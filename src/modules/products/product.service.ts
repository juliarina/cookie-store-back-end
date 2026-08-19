import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.validation.js';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toNumber = <T>(value: T): T => {
  if (value && typeof value === 'object' && 'price' in value) {
    return { ...value, price: Number((value as { price: { toNumber: () => number } }).price) };
  }
  return value;
};

const SORT_ORDERS: Record<NonNullable<ListProductsQuery['sort']>, Prisma.ProductOrderByWithRelationInput> = {
  price: { price: 'asc' },
  '-price': { price: 'desc' },
  rating: { rating: 'asc' },
  '-rating': { rating: 'desc' },
  newest: { createdAt: 'desc' },
  '-newest': { createdAt: 'asc' },
};

const PUBLIC_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  rating: true,
  tag: true,
  imageUrl: true,
  category: { select: { id: true, name: true, slug: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export const listProducts = async (query: ListProductsQuery) => {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: SORT_ORDERS[query.sort],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: products.map(toNumber), pagination: buildPaginationMeta({ page, limit, total }) };
};

export const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: PUBLIC_PRODUCT_SELECT,
  });
  if (!product) throw ApiError.notFound('Product not found');
  return toNumber(product);
};

const resolveCategoryId = async (categoryId: string | undefined | null) => {
  if (categoryId === undefined || categoryId === null) return categoryId;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw ApiError.badRequest('Category not found', 'NOT_FOUND');
  return categoryId;
};

export const createProduct = async (input: CreateProductInput) => {
  const categoryId = await resolveCategoryId(input.categoryId);

  const data: Prisma.ProductCreateInput = {
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    description: input.description,
    price: input.price,
    stock: input.stock,
    rating: input.rating,
    tag: input.tag,
    imageUrl: input.imageUrl,
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
  };

  const product = await prisma.product.create({ data });
  return toNumber(product);
};

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  const categoryId = await resolveCategoryId(input.categoryId);

  const data: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.price !== undefined) data.price = input.price;
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.tag !== undefined) data.tag = input.tag;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.categoryId !== undefined) {
    data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }

  const product = await prisma.product.update({ where: { id }, data });
  return toNumber(product);
};

export const softDeleteProduct = async (id: string) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  return toNumber(product);
};