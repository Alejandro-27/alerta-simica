import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { writeLog } from '../models/SystemLog';
import { pushService } from './pushService';
import type { AlertLevel, NotificationType, PushPayload } from '../../../shared/src';

export interface CreateNotificationInput {
  userId: mongoose.Types.ObjectId;
  earthquakeId?: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  body: string;
  level?: AlertLevel;
  payload: PushPayload;
  /** Si false, registra la notificación pero no intenta push. */
  sendPush?: boolean;
}

export interface CreateNotificationResult {
  /** false si ya existía una notificación igual (deduplicación). */
  created: boolean;
  delivered: boolean;
  error?: string;
}

/**
 * Crea el registro de notificación (deduplicado por userId+earthquakeId+type)
 * y, si aplica, envía el push. Nunca envía dos veces la misma alerta.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  const now = new Date();
  const dedupe = input.earthquakeId
    ? { userId: input.userId, earthquakeId: input.earthquakeId, type: input.type }
    : null;

  if (dedupe) {
    const existing = await Notification.findOne(dedupe);
    if (existing) {
      return { created: false, delivered: existing.delivered, error: existing.error ?? undefined };
    }
  }

  const sendPush = input.sendPush !== false;
  let delivered = false;
  let error: string | undefined;

  if (sendPush) {
    try {
      const result = await pushService.sendToUser(input.userId, input.payload);
      delivered = result.delivered > 0;
      if (!delivered && result.failed > 0) {
        error = result.errors[0] ?? 'Push fallido';
      }
    } catch (err) {
      error = (err as Error).message;
    }
  }

  try {
    await Notification.create({
      userId: input.userId,
      earthquakeId: input.earthquakeId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      sentAt: now,
      delivered,
      error: error ?? null,
      provider: 'web-push',
      payload: input.payload,
      level: input.level ?? 'NORMAL',
    });
  } catch (err) {
    // E11000: duplicado (otra instancia ganó la carrera). No reenviar.
    if ((err as { code?: number }).code === 11000) {
      return { created: false, delivered, error };
    }
    throw err;
  }

  await writeLog('info', 'alert', 'Notificación registrada', {
    userId: String(input.userId),
    type: input.type,
    delivered,
    error,
  });

  return { created: true, delivered, error };
}
