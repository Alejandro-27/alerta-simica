import webpush from 'web-push';
import type { PushPayload } from '../../../shared/src';
import type { PushSubscriptionDoc } from '../models/PushSubscriptionDoc';
import type { NotificationProvider, PushSendResult } from './types';

/**
 * Proveedor Web Push estándar (Push API + Service Worker).
 * Usa llaves VAPID. No requiere Firebase.
 */
export class WebPushNotificationProvider implements NotificationProvider {
  readonly name = 'web-push';
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly subject: string;

  constructor(publicKey: string, privateKey: string, subject: string) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.subject = subject;
  }

  isConfigured(): boolean {
    return Boolean(this.publicKey && this.privateKey);
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Web Push no configurado: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
    }
    webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
  }

  async send(subscription: PushSubscriptionDoc, payload: PushPayload): Promise<PushSendResult> {
    this.ensureConfigured();
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        },
        JSON.stringify(payload),
        { TTL: 120, urgency: 'high' },
      );
      return { delivered: true };
    } catch (err) {
      const e = err as { statusCode?: number; body?: unknown; message?: string };
      return {
        delivered: false,
        error: e.message ?? 'Error de envío',
        statusCode: e.statusCode,
      };
    }
  }
}

/**
 * Adaptador futuro para Firebase Cloud Messaging (FCM).
 * En esta primera versión el sistema usa Web Push estándar; esta clase
 * queda como referencia de implementación para cuando se necesite.
 */
export class FutureFCMNotificationProvider implements NotificationProvider {
  readonly name = 'fcm';
  isConfigured(): boolean {
    return false;
  }
  async send(): Promise<PushSendResult> {
    return { delivered: false, error: 'FCM no implementado en esta versión (use web-push)' };
  }
}
