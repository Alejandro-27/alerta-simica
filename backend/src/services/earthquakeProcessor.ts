import type { EarthquakeInput } from '../../../shared/src';
import type { ProviderRegistry } from '../adapters';
import { normalizeEvent } from '../adapters';
import { upsertEarthquake } from './earthquakeService';
import { findAffectedUsers } from './userService';
import { decideAlertLevel, passesThreshold } from './alertEngine';
import { getAlertConfig } from './alertConfigService';
import { createNotification } from './notificationService';
import { updateSourceStatus } from '../models/SourceStatus';
import { writeLog } from '../models/SystemLog';
import { logger } from '../utils/logger';
import { pushService } from './pushService';
import type { AlertLevel } from '../../../shared/src';

export interface ProcessorStats {
  sourcesChecked: number;
  eventsFetched: number;
  newEvents: number;
  updatedEvents: number;
  unchangedEvents: number;
  alertsSent: number;
  alertsSkipped: number;
  errors: { source: string; message: string }[];
  durationMs: number;
}

export interface ProcessorOptions {
  /** Fuentes habilitadas, p.ej. ['sgc','usgs'] */
  sources: string[];
}

/**
 * Pipeline completo:
 * fuentes → normalización → deduplicación → almacenamiento → motor de alertas
 * → usuarios afectados → notificación push → logs.
 *
 * Tolerante a fallos: si una fuente falla, se registra y se sigue con las demás.
 */
export class EarthquakeProcessor {
  private providers: ProviderRegistry;

  constructor(providers: ProviderRegistry) {
    this.providers = providers;
  }

  async process(opts: ProcessorOptions): Promise<ProcessorStats> {
    const started = Date.now();
    const stats: ProcessorStats = {
      sourcesChecked: 0,
      eventsFetched: 0,
      newEvents: 0,
      updatedEvents: 0,
      unchangedEvents: 0,
      alertsSent: 0,
      alertsSkipped: 0,
      errors: [],
      durationMs: 0,
    };

    const config = await getAlertConfig(true);
    if (!config.enabled) {
      logger.info('Procesamiento sísmico pausado (configuración global deshabilitada)');
      return stats;
    }

    for (const sourceName of opts.sources) {
      const provider = this.providers.get(sourceName);
      if (!provider) {
        stats.errors.push({ source: sourceName, message: 'Proveedor no registrado' });
        continue;
      }
      const sourceEnabled = config.sources[sourceName]?.enabled ?? true;
      if (!sourceEnabled) {
        await updateSourceStatus(sourceName, { status: 'disabled', lastCheckedAt: new Date() });
        continue;
      }
      if (!provider.isConfigured()) {
        await updateSourceStatus(sourceName, {
          status: 'misconfigured',
          lastError: 'URL no configurada',
          lastCheckedAt: new Date(),
        });
        continue;
      }

      stats.sourcesChecked += 1;
      const sourceStarted = Date.now();
      try {
        const { events, queriedUrl } = await provider.getRecentEarthquakes();
        stats.eventsFetched += events.length;
        await updateSourceStatus(sourceName, {
          status: 'up',
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          lastError: null,
          consecutiveFailures: 0,
          processingTimeMs: Date.now() - sourceStarted,
          lastEventAt: events.length ? events[0].eventTime : undefined,
        });
        logger.info({ source: sourceName, count: events.length, url: queriedUrl }, 'Consulta a fuente sísmica');

        for (const raw of events) {
          try {
            const event = normalizeEvent(raw);
            stats.eventsFetched;
            await this.handleEvent(event, stats);
          } catch (err) {
            stats.errors.push({ source: sourceName, message: (err as Error).message });
            logger.warn({ source: sourceName, err }, 'Evento inválido descartado');
          }
        }
      } catch (err) {
        const message = (err as Error).message;
        stats.errors.push({ source: sourceName, message });
        await updateSourceStatus(sourceName, {
          status: 'down',
          lastCheckedAt: new Date(),
          lastError: message,
          $inc: { consecutiveFailures: 1 } as never,
        });
        logger.warn({ source: sourceName, err }, 'Fuente sísmica no disponible');
      }
    }

    stats.durationMs = Date.now() - started;
    await writeLog('info', 'job', 'Ciclo de procesamiento sísmico completado', {
      ...stats,
    });
    return stats;
  }

  private async handleEvent(event: EarthquakeInput, stats: ProcessorStats): Promise<void> {
    const result = await upsertEarthquake(event);
    if (result.created) stats.newEvents += 1;
    else if (result.updated) stats.updatedEvents += 1;
    else stats.unchangedEvents += 1;

    // Solo se evalúa la alerta cuando el evento es nuevo o cambió.
    if (!result.changed) return;

    await this.runAlertsForEvent(result.doc, event, stats);
  }

  private async runAlertsForEvent(
    doc: { _id: { toString(): string }; magnitude: number; latitude: number; longitude: number; depth: number; place: string; demo: boolean },
    event: EarthquakeInput,
    stats: ProcessorStats,
  ): Promise<void> {
    if (doc.demo) return; // los datos de demostración NUNCA generan alertas reales
    const config = await getAlertConfig();
    const earthquakeId = doc._id as never as import('mongoose').Types.ObjectId;

    if (!passesThreshold({ magnitude: event.magnitude, depth: event.depth }, config)) {
      stats.alertsSkipped += 1;
      return;
    }

    const eligible = await findAffectedUsers(
      { latitude: event.latitude, longitude: event.longitude, magnitude: event.magnitude, depth: event.depth },
      config,
    );

    if (eligible.length === 0) return;

    for (const user of eligible) {
      const distanceKm = user.distanceKm;
      const decision = decideAlertLevel(
        {
          magnitude: event.magnitude,
          depth: event.depth,
          alertLevel: event.alertLevel,
          distanceKm,
        },
        config,
      );
      const withinRadius = distanceKm !== null && distanceKm <= config.alertRadiusKm;

      // Los usuarios sin ubicación reciben solo alerta informativa nacional.
      const type = withinRadius ? 'EARTHQUAKE_ALERT' : 'EARTHQUAKE_DETECTED';
      const level: AlertLevel = withinRadius ? decision.level : 'NORMAL';

      const title = this.buildTitle(level, event.place);
      const body = this.buildBody(event, distanceKm);
      const result = await createNotification({
        userId: user.userId,
        earthquakeId,
        type,
        title,
        body,
        level,
        payload: {
          type,
          eventId: String(earthquakeId),
          title,
          body,
          url: `/earthquakes/${String(earthquakeId)}`,
          magnitude: event.magnitude,
          distanceKm: distanceKm ?? undefined,
        },
      });
      if (result.created) {
        stats.alertsSent += 1;
        if (result.error) {
          stats.errors.push({ source: 'push', message: result.error });
        }
      } else {
        stats.alertsSkipped += 1;
      }
    }
  }

  private buildTitle(level: AlertLevel, place: string): string {
    switch (level) {
      case 'HIGH':
        return 'Posible afectación sísmica en tu zona';
      case 'CRITICAL':
        return 'Alerta crítica sísmica (fuente oficial)';
      case 'WARNING':
        return 'Evento sísmico detectado cerca de tu ubicación';
      default:
        return 'Nuevo evento sísmico detectado';
    }
  }

  private buildBody(event: EarthquakeInput, distanceKm: number | null): string {
    const dist = distanceKm !== null ? ` a ${Math.round(distanceKm)} km de tu ubicación` : '';
    return `Magnitud ${event.magnitude.toFixed(1)} · profundidad ${Math.round(event.depth)} km · ${event.place}${dist}`;
  }
}

export function getPushConfigured(): boolean {
  return pushService.isConfigured();
}
