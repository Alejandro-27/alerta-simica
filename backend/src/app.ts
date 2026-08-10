import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { mongoSanitize } from './middleware/sanitize';
import { pinoHttpSerializer } from './utils/httpLogSerializer';

import authRoutes from './routes/auth';
import earthquakeRoutes from './routes/earthquakes';
import userRoutes from './routes/user';
import pushRoutes from './routes/push';
import healthRoutes from './routes/health';
import adminRoutes from './routes/admin';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: pinoHttpSerializer,
      },
      autoLogging: { ignore: (req) => req.url?.includes('/api/health') ?? false },
    }),
  );

  const origins = env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim());
  app.use(cors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(hpp());
  app.use(mongoSanitize);
  app.use(apiLimiter);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/earthquakes', earthquakeRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/', (_req, res) => {
    res.json({ name: 'AlertaSísmica API', version: '1.0.0', docs: '/api/health' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
