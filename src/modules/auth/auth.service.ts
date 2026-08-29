import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import {
  clearFailedLogins,
  isLoginLocked,
  recordFailedLogin,
} from '../../lib/loginThrottle.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from './token.service.js';
import type { LoginInput, RegisterInput, UpdateMeInput, ChangePasswordInput } from './auth.validation.js';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const register = async (input: RegisterInput): Promise<SafeUser> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'CUSTOMER',
    },
    select: USER_SELECT,
  });
};

export interface LoginResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const emailKey = input.email.trim().toLowerCase();

  if (await isLoginLocked(emailKey)) {
    throw ApiError.rateLimited('Too many failed login attempts. Please try again later.');
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    await recordFailedLogin(emailKey);
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(emailKey);
    throw ApiError.unauthorized('Invalid email or password');
  }

  await clearFailedLogins(emailKey);

  const refreshToken = generateRefreshToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });

  const { passwordHash, refreshTokenHash, previousRefreshTokenHash, resetToken, resetTokenExpiry, ...safe } = user;
  void passwordHash;
  void refreshTokenHash;
  void previousRefreshTokenHash;
  void resetToken;
  void resetTokenExpiry;

  return {
    user: safe,
    accessToken: generateAccessToken(user.id, user.role),
    refreshToken,
  };
};

export interface RefreshResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export const refresh = async (cookieToken: string | undefined): Promise<RefreshResult> => {
  if (!cookieToken) throw ApiError.unauthorized('Missing refresh token');

  const presentedHash = hashRefreshToken(cookieToken);
  const user = await prisma.user.findFirst({ where: { refreshTokenHash: presentedHash } });

  if (!user) {
    const reuse = await prisma.user.findFirst({ where: { previousRefreshTokenHash: presentedHash } });
    if (reuse) {
      await prisma.user.update({
        where: { id: reuse.id },
        data: { refreshTokenHash: null, previousRefreshTokenHash: null },
      });
      throw ApiError.unauthorized('Refresh token reuse detected, session revoked');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const newRefreshToken = generateRefreshToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenHash: hashRefreshToken(newRefreshToken),
      previousRefreshTokenHash: presentedHash,
    },
  });

  const { passwordHash, refreshTokenHash, previousRefreshTokenHash, resetToken, resetTokenExpiry, ...safe } = user;
  void passwordHash;
  void refreshTokenHash;
  void previousRefreshTokenHash;
  void resetToken;
  void resetTokenExpiry;

  return {
    user: safe,
    accessToken: generateAccessToken(user.id, user.role),
    refreshToken: newRefreshToken,
  };
};

export const logout = async (userId: string | undefined, cookieToken: string | undefined): Promise<void> => {
  let targetId: string | undefined = userId;

  if (!targetId && cookieToken) {
    const hash = hashRefreshToken(cookieToken);
    const user = await prisma.user.findFirst({
      where: { OR: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }] },
    });
    targetId = user?.id;
  }

  if (targetId) {
    await prisma.user.update({
      where: { id: targetId },
      data: { refreshTokenHash: null, previousRefreshTokenHash: null },
    });
  }
};

export const getMe = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const deleteMe = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { cart: { userId } } });
    await tx.cart.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });
    await tx.order.updateMany({ where: { userId }, data: { userId: null } });
    await tx.user.delete({ where: { id: userId } });
  });
};

export const updateMe = async (userId: string, input: UpdateMeInput): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('Email already in use');
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;

  return prisma.user.update({ where: { id: userId }, data, select: USER_SELECT });
};

export const changePassword = async (userId: string, input: ChangePasswordInput): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const valid = await comparePassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Current password is incorrect', 'VALIDATION_ERROR', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }

  const passwordHash = await hashPassword(input.newPassword);
  return prisma.user.update({ where: { id: userId }, data: { passwordHash }, select: USER_SELECT });
};