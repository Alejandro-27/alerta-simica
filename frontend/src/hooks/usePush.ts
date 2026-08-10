import { useCallback, useEffect, useState } from 'react';
import { endpoints } from '../lib/api';

export interface PushCapabilities {
  supported: boolean;
  /** Servidor con VAPID configurado */
  serverConfigured: boolean;
  /** El Service Worker está registrado */
  swReady: boolean;
  /** Permission API state */
  permission: NotificationPermission | 'unsupported';
  /** Suscripción activa en el servidor */
  subscribed: boolean;
  /** El usuario instaló la PWA (o está en standalone) */
  installed: boolean;
  /** iOS: requiere instrucciones de instalación antes de permitir push */
  isIOS: boolean;
}

const initialState: PushCapabilities = {
  supported: false,
  serverConfigured: false,
  swReady: false,
  permission: 'unsupported',
  subscribed: false,
  installed: false,
  isIOS: false,
};

function detectPlatform(): { isIOS: boolean; standalone: boolean } {
  if (typeof window === 'undefined') return { isIOS: false, standalone: false };
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return { isIOS, standalone };
}

/**
 * Hook central de notificaciones push:
 * - feature detection (no detección rígida por navegador)
 * - registro del Service Worker
 * - suscripción/desuscripción Web Push
 * - lógica iOS (solo pedir permiso con PWA instalada)
 */
export function usePush() {
  const [caps, setCaps] = useState<PushCapabilities>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const { isIOS, standalone } = detectPlatform();
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    let serverConfigured = caps.serverConfigured;
    let subscribed = caps.subscribed;
    let permission: NotificationPermission | 'unsupported' = 'unsupported';
    if (supported && 'Notification' in window) {
      permission = Notification.permission;
    }

    try {
      const pub = await endpoints.pushPublicKey();
      serverConfigured = pub.configured;
      if (tokenStoreHasToken()) {
        const st = await endpoints.pushStatus();
        subscribed = st.subscribed;
      }
    } catch {
      /* backend no disponible */
    }
    setCaps({
      supported,
      serverConfigured,
      swReady: Boolean(navigator.serviceWorker?.controller),
      permission,
      subscribed,
      installed: standalone,
      isIOS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const registerSW = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      void reg;
      setCaps((c) => ({ ...c, swReady: true }));
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Activa las alertas push. Debe llamarse desde una interacción directa
   * del usuario (botón "Activar alertas").
   */
  const activate = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    setBusy(true);
    setError(null);
    try {
      if (!caps.supported) {
        throw new Error('Este navegador no soporta notificaciones push.');
      }
      if (!caps.serverConfigured) {
        throw new Error('Las notificaciones aún no están configuradas en el servidor.');
      }
      if (caps.isIOS && !caps.installed) {
        return {
          ok: false,
          message:
            'En iOS, agrega la aplicación a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y vuelve a intentar.',
        };
      }
      const swReady = await registerSW();
      if (!swReady) throw new Error('No se pudo registrar el Service Worker.');

      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError(
            'Permiso denegado. Para recibir alertas, activa las notificaciones para esta aplicación en los ajustes del dispositivo.',
          );
          await refreshStatus();
          return { ok: false, message: error ?? 'Permiso denegado.' };
        }
      }

      const pub = await endpoints.pushPublicKey();
      if (!pub.publicKey) throw new Error('El servidor no expone la llave pública VAPID.');

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      let subscription = existing;
      if (!subscription) {
        const base64 = urlBase64ToUint8Array(pub.publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64 as BufferSource,
        });
      }

      const subJson = subscription.toJSON();
      if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('La suscripción push no incluye llaves válidas.');
      }
      await endpoints.pushSubscribe({
        subscription: {
          endpoint: subscription.endpoint,
          keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
        },
        device: navigator.userAgent.slice(0, 120),
        browser: detectBrowser(),
        platform: caps.isIOS ? 'iOS' : detectPlatformName(),
      });

      await refreshStatus();
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo activar las notificaciones.';
      setError(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  }, [caps, registerSW, refreshStatus, error]);

  const deactivate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await endpoints.pushUnsubscribe(sub.endpoint).catch(() => undefined);
          await sub.unsubscribe();
        }
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar.');
    } finally {
      setBusy(false);
    }
  }, [refreshStatus]);

  return { caps, busy, error, activate, deactivate, refreshStatus, registerSW };
}

function tokenStoreHasToken(): boolean {
  return Boolean(localStorage.getItem('alertasimica_access'));
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Otro';
}

function detectPlatformName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Desconocido';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
