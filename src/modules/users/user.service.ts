import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type { ListUsersQuery, UpdateUserInput } from './user.validation.js';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listUsers = async (query: ListUsersQuery) => {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.UserWhereInput = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.role ? { role: query.role } : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, pagination: buildPaginationMeta({ page, limit, total }) };
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  const data: Prisma.UserUpdateInput = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
};