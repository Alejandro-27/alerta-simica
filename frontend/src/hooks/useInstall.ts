import { useCallback, useState } from 'react';

export type InstallStage =
  | { state: 'idle' }
  | { state: 'installable'; prompt: () => Promise<boolean> }
  | { state: 'installed' }
  | { state: 'unsupported' };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallInfo {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  /** Solo disponible si el navegador dispara beforeinstallprompt (Android/desktop). */
  promptInstall: () => Promise<boolean>;
}

export function useInstall(): InstallInfo {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  const updateStandalone = useCallback(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    if (standalone) setCanInstall(false);
  }, []);

  const listenBeforeInstallPrompt = useCallback(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const listenInstalled = useCallback(() => {
    const handler = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // registrar listeners una sola vez
  const [registered] = useState(() => {
    updateStandalone();
    window.addEventListener('resize', updateStandalone);
    const offPrompt = listenBeforeInstallPrompt();
    const offInstalled = listenInstalled();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateStandalone);
    return { offPrompt, offInstalled };
  });
  void registered;

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // iOS / navegadores sin beforeinstallprompt: instrucciones manuales.
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return { canInstall, isInstalled, isIOS, isAndroid, isDesktop, promptInstall };
}
