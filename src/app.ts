import express from 'express';
import type { Request } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { corsMiddleware } from './middleware/cors.js';
import { requestId } from './middleware/requestId.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './modules/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(requestId);
app.use(globalLimiter);

morgan.token('requestId', (req) => (req as Request).requestId ?? '');
app.use(
  morgan(
    ':method :url :status :res[content-length] :response-time ms (:requestId)',
    { stream: { write: (message) => logger.http(message.trim()) } }
  )
);

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

app.use('/api/v1', apiRouter);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Crumb & Co. — API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

app.use(notFound);
app.use(errorHandler);
