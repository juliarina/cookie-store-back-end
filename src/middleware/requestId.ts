import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.http('request', {
      requestId: id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
