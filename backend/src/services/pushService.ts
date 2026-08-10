import mongoose from 'mongoose';
import { PushSubscription } from '../models/PushSubscriptionDoc';
import { writeLog } from '../models/SystemLog';
import type { PushPayload } from '../../../shared/src';
import type { PushSubscriptionDoc } from '../models/PushSubscriptionDoc';
import { WebPushNotificationProvider } from '../notification-providers/WebPushNotificationProvider';
import { env, pushConfigured } from '../config/env';
import type { NotificationProvider } from '../notification-providers/types';

export const MAX_PUSH_RETRIES = 2;

export class PushService {
  private provider: NotificationProvider;

  constructor(provider?: NotificationProvider) {
    this.provider =
      provider ??
      new WebPushNotificationProvider(env.vapidPublicKey, env.vapidPrivateKey, env.vapidSubject);
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  async subscribe(
    userId: mongoose.Types.ObjectId,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    deviceInfo: { device?: string; browser?: string; platform?: string },
  ): Promise<PushSubscriptionDoc> {
    const now = new Date();
    const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
    if (existing) {
      existing.userId = userId;
      existing.keys = subscription.keys;
      existing.active = true;
      existing.failureCount = 0;
      existing.lastUsedAt = now;
      Object.assign(existing, deviceInfo);
      await existing.save();
      return existing.toObject() as unknown as PushSubscriptionDoc;
    }
    const doc = await PushSubscription.create({
      userId,
      ...subscription,
      ...deviceInfo,
      active: true,
      lastUsedAt: now,
    });
    return doc.toObject() as unknown as PushSubscriptionDoc;
  }

  async unsubscribe(userId: mongoose.Types.ObjectId, endpoint: string): Promise<void> {
    await PushSubscription.deleteOne({ userId, endpoint });
    await writeLog('info', 'push', 'Suscripción push eliminada', { userId: String(userId) });
  }

  async listActiveForUser(userId: mongoose.Types.ObjectId): Promise<PushSubscriptionDoc[]> {
    return (await PushSubscription.find({ userId, active: true })).map((s) =>
      s.toObject(),
    ) as unknown as PushSubscriptionDoc[];
  }

  async activeSubscriptionsCount(): Promise<number> {
    return PushSubscription.countDocuments({ active: true });
  }

  /**
   * Envía un push a todas las suscripciones activas de un usuario.
   * - Retry controlado (MAX_PUSH_RETRIES).
   * - 404/410 => la suscripción está muerta: se desactiva automáticamente.
   */
  async sendToUser(
    userId: mongoose.Types.ObjectId,
    payload: PushPayload,
  ): Promise<{ delivered: number; failed: number; errors: string[] }> {
    const subs = await this.listActiveForUser(userId);
    let delivered = 0;
    let failed = 0;
    const errors: string[] = [];
    if (subs.length === 0) return { delivered, failed, errors };

    for (const sub of subs) {
      let attempt = 0;
      let lastError = 'Error desconocido';
      while (attempt <= MAX_PUSH_RETRIES) {
        attempt += 1;
        try {
          const result = await this.provider.send(sub, payload);
          if (result.delivered) {
            delivered += 1;
            await PushSubscription.updateOne(
              { _id: sub._id },
              { $set: { lastUsedAt: new Date() } },
            );
            break;
          }
          lastError = result.error ?? 'Error de envío';
          const status = result.statusCode;
          if (status === 404 || status === 410) {
            await PushSubscription.updateOne(
              { _id: sub._id },
              { $set: { active: false } },
            );
            await writeLog('warn', 'push', 'Suscripción push desactivada (endpoint eliminado)', {
              userId: String(userId),
              status,
            });
            failed += 1;
            errors.push(`endpoint ${status}`);
            break;
          }
          if (attempt > MAX_PUSH_RETRIES) {
            failed += 1;
            errors.push(lastError);
            await PushSubscription.updateOne(
              { _id: sub._id },
              { $inc: { failureCount: 1 } },
            );
          }
          await new Promise((r) => setTimeout(r, 500 * attempt));
        } catch (err) {
          lastError = (err as Error).message;
          failed += 1;
          errors.push(lastError);
          break;
        }
      }
    }
    return { delivered, failed, errors };
  }

  /** Envío directo (sin registro de Notification) para el test admin. */
  async sendTest(
    userId: mongoose.Types.ObjectId,
    title: string,
    body: string,
  ): Promise<{ delivered: number; failed: number }> {
    const result = await this.sendToUser(userId, {
      type: 'TEST_NOTIFICATION',
      title,
      body,
      url: '/',
    });
    return { delivered: result.delivered, failed: result.failed };
  }
}

export const pushService = new PushService();

export { pushConfigured };
