import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { TOKEN_TYPE } from '../../config/constants.js';
import type { Role } from '../../config/constants.js';

export const generateAccessToken = (userId: string, role: Role): string =>
  jwt.sign(
    { sub: userId, role, type: TOKEN_TYPE.ACCESS },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL } as jwt.SignOptions
  );

export const generateRefreshToken = (): string => crypto.randomBytes(32).toString('hex');

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');