import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

type SchemaMap = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

export const validate =
  ({ body, query, params }: SchemaMap = {}): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (body) req.validatedBody = body.parse(req.body);
      if (query) req.validatedQuery = query.parse(req.query);
      if (params) req.validatedParams = params.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };