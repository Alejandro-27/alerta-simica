import type { PushPayload } from '../../../shared/src';
import type { PushSubscriptionDoc } from '../models/PushSubscriptionDoc';

export interface PushSendResult {
  delivered: boolean;
  /** Mensaje de error legible si falló. */
  error?: string;
  /** HTTP status si el proveedor lo devuelve (404/410 => suscripción muerta). */
  statusCode?: number;
}

export interface NotificationProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Envía un push a una suscripción. Lanza si hay error de configuración. */
  send(subscription: PushSubscriptionDoc, payload: PushPayload): Promise<PushSendResult>;
}
