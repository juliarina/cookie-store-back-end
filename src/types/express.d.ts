import type { Role } from '../config/constants.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        role: Role;
      };
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export {};
