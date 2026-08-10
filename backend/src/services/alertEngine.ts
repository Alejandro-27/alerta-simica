import type { AlertLevel } from '../../../shared/src';
import type { AlertConfigurationDoc } from './alertConfigService';

export type AlertLevelRule = 'magnitude' | 'distance' | 'depth' | 'official';

export interface AlertDecision {
  level: AlertLevel;
  reasons: AlertLevelRule[];
}

/**
 * Motor de alertas: decide el nivel de un evento para un usuario según
 * reglas configurables (NUNCA solo por magnitud).
 *
 *  - NORMAL:    evento detectado, sin cercanía relevante.
 *  - WARNING:   dentro del radio de alerta del usuario.
 *  - HIGH:      dentro del radio Y magnitud >= highMagnitudeThreshold
 *               (interpretación conservadora de "posible afectación").
 *  - CRITICAL:  SOLO si una fuente oficial entrega nivel de alerta
 *               explícito (ej. USGS alert = "red").
 */
export function decideAlertLevel(
  event: {
    magnitude: number;
    depth: number;
    alertLevel: string | null;
    distanceKm: number | null;
  },
  config: Pick<
    AlertConfigurationDoc,
    'minimumMagnitude' | 'maximumDepth' | 'alertRadiusKm' | 'highMagnitudeThreshold'
  >,
): AlertDecision {
  const official = mapOfficialAlertLevel(event.alertLevel);
  if (official) return { level: official, reasons: ['official'] };

  const withinRadius =
    event.distanceKm !== null && event.distanceKm <= config.alertRadiusKm;

  if (withinRadius) {
    if (event.magnitude >= config.highMagnitudeThreshold) {
      return { level: 'HIGH', reasons: ['magnitude', 'distance'] };
    }
    return { level: 'WARNING', reasons: ['distance'] };
  }

  return { level: 'NORMAL', reasons: [] };
}

/** ¿Este evento pasa el umbral mínimo para generar alerta? */
export function passesThreshold(
  event: { magnitude: number; depth: number },
  config: Pick<AlertConfigurationDoc, 'minimumMagnitude' | 'maximumDepth'>,
): boolean {
  if (event.magnitude < config.minimumMagnitude) return false;
  if (config.maximumDepth !== null && event.depth > config.maximumDepth) return false;
  return true;
}

function mapOfficialAlertLevel(raw: string | null): AlertLevel | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'red' || v === 'rojo' || v === 'critical' || v === 'critico') return 'CRITICAL';
  if (v === 'orange' || v === 'naranja') return 'HIGH';
  if (v === 'yellow' || v === 'amarillo') return 'WARNING';
  return null;
}
