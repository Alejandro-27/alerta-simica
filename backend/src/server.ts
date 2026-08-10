import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';
import { startScheduler, stopScheduler } from './jobs/scheduler';
import { initSystemConfig } from './services/initService';

async function bootstrap() {
  await connectDatabase();
  await initSystemConfig();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`API AlertaSísmica escuchando en el puerto ${env.port} (${env.nodeEnv})`);
  });

  if (env.pollEnabled) {
    startScheduler();
  } else {
    logger.warn('Scheduler de polling deshabilitado (EARTHQUAKE_POLL_ENABLED=false)');
  }

  const shutdown = async (signal: string) => {
    logger.info(`Recibida señal ${signal}, cerrando...`);
    stopScheduler();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'No se pudo iniciar el servidor');
  process.exit(1);
});
