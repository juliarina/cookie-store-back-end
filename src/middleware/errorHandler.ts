import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../config/constants.js';
import { logger } from '../lib/logger.js';

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid request body',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Malformed JSON in request body',
      },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: ERROR_CODES.CONFLICT, message: 'Resource already exists' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Resource not found' },
      });
    }
    if (err.code === 'P1001' || err.code === 'P1000') {
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' },
      });
    }
  }

  const errorMessage = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled error', {
    requestId,
    message: errorMessage,
    stack,
    path: req.originalUrl,
    method: req.method,
  });

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: isProd ? 'Internal server error' : errorMessage,
      ...(isProd ? {} : { stack }),
    },
  });
};
