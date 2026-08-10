import pino from 'pino';
import { env } from '../config/env';

const transport =
  env.logFormat === 'pretty'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined;

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
      '*.keys.p256dh',
      '*.keys.auth',
    ],
    censor: '[REDACTED]',
  },
  transport,
});
