import { logger } from '../utils/logger';
import { env } from '../config/env';
import { getAlertConfig } from '../services/alertConfigService';
import { ProviderRegistry } from '../adapters';
import { EarthquakeProcessor } from '../services/earthquakeProcessor';
import { withLock } from '../utils/lock';

const INSTANCE_ID = `${process.pid}-${Date.now().toString(36)}`;
const LOCK_TTL_MS = 90_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/**
 * Scheduler del polling sísmico.
 * - No polling desde el frontend: todo pasa por este job.
 * - Lock distribuido en MongoDB: con varias instancias, solo una ejecuta.
 * - El intervalo se relee de la configuración cada ciclo (editable en /admin).
 */
export function startScheduler(): void {
  if (timer) return;
  logger.info(`Scheduler sísmico iniciado (instancia ${INSTANCE_ID})`);

  const registry = new ProviderRegistry({
    sgcUrl: env.sgcApiUrl,
    usgsUrl: env.usgsApiUrl,
    mockEnabled: env.mockEnabled,
    mockIntervalMinutes: env.mockIntervalMinutes,
  });
  const processor = new EarthquakeProcessor(registry);

  const tick = async () => {
    if (running) return; // evita superposición en la misma instancia
    running = true;
    try {
      const config = await getAlertConfig();
      const { executed, result } = await withLock(
        'earthquake-poll',
        LOCK_TTL_MS,
        INSTANCE_ID,
        async () => {
          const sources = Object.entries(config.sources)
            .filter(([, v]) => v.enabled)
            .map(([k]) => k);
          return processor.process({ sources });
        },
      );
      if (executed && result) {
        logger.info(
          {
            newEvents: result.newEvents,
            updatedEvents: result.updatedEvents,
            alerts: result.alertsSent,
            errors: result.errors.length,
            durationMs: result.durationMs,
          },
          'Ciclo de polling completado',
        );
      }
    } catch (err) {
      logger.error({ err }, 'Fallo en el ciclo de polling');
    } finally {
      running = false;
    }
  };

  // Primera ejecución a los 3s del arranque.
  setTimeout(tick, 3000);
  timer = setInterval(tick, env.pollIntervalSeconds * 1000);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function isSchedulerRunning(): boolean {
  return Boolean(timer);
}
