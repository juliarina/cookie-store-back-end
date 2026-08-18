import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
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
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query) as ParsedQs;
      if (params) req.params = params.parse(req.params) as ParamsDictionary;
      next();
    } catch (error) {
      next(error);
    }
  };
