import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let retryCount = 0;
const MAX_RETRIES = 5;

export async function connectDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI no configurada');
  }
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    logger.info('MongoDB conectada');
    retryCount = 0;
  } catch (err) {
    retryCount += 1;
    logger.error({ err }, `Fallo al conectar a MongoDB (intento ${retryCount})`);
    if (retryCount >= MAX_RETRIES) throw err;
    await new Promise((r) => setTimeout(r, 5000));
    await connectDatabase();
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export async function databaseHealth(): Promise<boolean> {
  try {
    await mongoose.connection.db?.admin().ping();
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}
