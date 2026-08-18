import cors from 'cors';
import type { CorsOptions } from 'cors';
import { corsOrigins } from '../config/env.js';

const options: CorsOptions = {
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};

export const corsMiddleware = cors(options);
