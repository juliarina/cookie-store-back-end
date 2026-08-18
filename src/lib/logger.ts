import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'green',
  verbose: 'cyan',
  debug: 'blue',
});

const devFormat = printf(({ timestamp: ts, level, message, requestId, ...meta }) => {
  const base = `${ts} [${level}]${requestId ? ` (${requestId})` : ''} ${message}`;
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return base + extra;
});

const redact = winston.format((info) => {
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'cookie', 'authorization'];
  const redactValue = (value: Record<string, unknown>) => {
    for (const [key, nested] of Object.entries(value)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        value[key] = '[REDACTED]';
      } else if (nested && typeof nested === 'object') {
        redactValue(nested as Record<string, unknown>);
      }
    }
    return value;
  };
  redactValue(info);
  return info;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    redact(),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
  ),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});
