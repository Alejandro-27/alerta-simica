import mongoose, { Schema, model } from 'mongoose';

export const systemLogSchema = new Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'], required: true },
    category: {
      type: String,
      enum: ['system', 'earthquake', 'alert', 'push', 'source', 'auth', 'admin', 'job'],
      required: true,
    },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { capped: { size: 50 * 1024 * 1024, max: 20000 } },
);

systemLogSchema.index({ category: 1, timestamp: -1 });

export const SystemLog = model('SystemLog', systemLogSchema);

export async function writeLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  category: 'system' | 'earthquake' | 'alert' | 'push' | 'source' | 'auth' | 'admin' | 'job',
  message: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await SystemLog.create({ level, category, message, meta });
  } catch (err) {
    // Nunca dejes que el log rompa el flujo principal.
    console.error('Fallo al escribir log en MongoDB', err);
  }
}
