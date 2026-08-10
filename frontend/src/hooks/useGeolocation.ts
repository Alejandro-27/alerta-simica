import { useCallback, useEffect, useState } from 'react';
import type { UserLocation } from '@shared';

export interface GeolocationState {
  loading: boolean;
  location: UserLocation | null;
  error: string | null;
  supported: boolean;
}

/** Pide la ubicación SOLO cuando el usuario lo solicita (botón). */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    location: null,
    error: null,
    supported: 'geolocation' in navigator,
  });

  const request = useCallback((): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setState((s) => ({ ...s, error: 'Tu navegador no soporta geolocalización.' }));
        resolve(null);
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            updatedAt: new Date(),
          };
          setState({ loading: false, location: loc, error: null, supported: true });
          resolve(loc);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de ubicación denegado. Puedes ingresar tu ubicación manualmente.'
              : 'No se pudo obtener tu ubicación. Intenta de nuevo.';
          setState((s) => ({ ...s, loading: false, error: message }));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
      );
    });
  }, []);

  useEffect(() => {
    // No pedimos ubicación al entrar. Se guarda solo si el usuario la comparte.
  }, []);

  return { ...state, request };
}
