import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type { ListUsersQuery, RegisterAdminInput, UpdateUserInput } from './user.validation.js';

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

export const registerAdmin = async (input: RegisterAdminInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'ADMIN',
    },
    select: USER_SELECT,
  });
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  return prisma.user.update({ where: { id }, data: { isActive: input.isActive }, select: USER_SELECT });
};

export const deleteUser = async (actorId: string, targetId: string): Promise<void> => {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found');

  if (target.id === actorId) throw ApiError.forbidden('Admins cannot delete themselves');
  if (target.role === 'ADMIN') throw ApiError.forbidden('Admins cannot delete other admins');

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { cart: { userId: targetId } } });
    await tx.cart.deleteMany({ where: { userId: targetId } });
    await tx.review.deleteMany({ where: { userId: targetId } });
    await tx.order.updateMany({ where: { userId: targetId }, data: { userId: null } });
    await tx.user.delete({ where: { id: targetId } });
  });
};