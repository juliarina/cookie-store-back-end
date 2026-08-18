import type { Response } from 'express';

interface SuccessOptions<T> {
  status?: number;
  data?: T | null;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  { status = 200, data = null, meta }: SuccessOptions<T> = {}
) => {
  const body: Record<string, unknown> = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
};
