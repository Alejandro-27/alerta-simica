import mongoose from 'mongoose';
import { Earthquake } from '../models/Earthquake';
import type { EarthquakeInput } from '../../../shared/src';
import { COLOMBIA_BBOX } from '../../../shared/src';
import { USGSEarthquakeProvider } from '../adapters/USGSEarthquakeProvider';
import { env } from '../config/env';

export interface ProcessEarthquakeResult {
  created: boolean;
  updated: boolean;
  changed: boolean;
  doc: {
    _id: mongoose.Types.ObjectId;
    externalId: string;
    source: string;
    magnitude: number;
    latitude: number;
    longitude: number;
    depth: number;
    place: string;
    eventTime: Date;
    firstDetectedAt: Date;
    lastSeenAt: Date;
    demo: boolean;
  };
}

/**
 * Persiste un evento con deduplicación por (externalId, source):
 *  - si NO existe => se crea (nuevo evento)
 *  - si existe y cambió => se actualizan los campos y lastSeenAt
 * Devuelve created/updated/changed para que el procesador decida si alerta.
 */
export async function upsertEarthquake(event: EarthquakeInput): Promise<ProcessEarthquakeResult> {
  const now = new Date();
  const existing = await Earthquake.findOne({
    externalId: event.externalId,
    source: event.source,
  });

  if (!existing) {
    const doc = await Earthquake.create({
      ...event,
      firstDetectedAt: now,
      lastSeenAt: now,
      demo: event.source === 'mock',
    });
    return {
      created: true,
      updated: false,
      changed: true,
      doc: toResult(doc),
    };
  }

  const fieldsChanged = (
    [
      'magnitude',
      'magnitudeType',
      'latitude',
      'longitude',
      'depth',
      'place',
      'eventTime',
      'tsunami',
      'felt',
      'alertLevel',
      'status',
      'sourceUrl',
    ] as const
  ).some((key) => {
    const a = (existing as unknown as Record<string, unknown>)[key];
    const b = (event as unknown as Record<string, unknown>)[key];
    if (a instanceof Date || b instanceof Date) {
      return new Date(a as string).getTime() !== new Date(b as string).getTime();
    }
    return a !== b;
  });

  if (!fieldsChanged) {
    // Solo refrescar lastSeenAt cuando se vuelve a ver el evento.
    if (existing.lastSeenAt.getTime() !== now.getTime()) {
      existing.lastSeenAt = now;
      await existing.save();
    }
    return { created: false, updated: false, changed: false, doc: toResult(existing) };
  }

  Object.assign(existing, {
    magnitude: event.magnitude,
    magnitudeType: event.magnitudeType,
    latitude: event.latitude,
    longitude: event.longitude,
    depth: event.depth,
    place: event.place,
    eventTime: event.eventTime,
    updatedAt: event.updatedAt,
    tsunami: event.tsunami,
    felt: event.felt,
    alertLevel: event.alertLevel,
    status: event.status,
    sourceUrl: event.sourceUrl,
    rawData: event.rawData,
    lastSeenAt: now,
  });
  await existing.save();

  return { created: false, updated: true, changed: true, doc: toResult(existing) };
}

/**
 * Tamaño máximo de un rango histórico por consulta (en días). El USGS limita
 * cada respuesta a 20.000 eventos; con estos pisos de magnitud es seguro.
 */
const BACKFILL_MAX_SPAN_DAYS = 60;
/** Cada ventana de descarga se divide en trozos de 14 días. */
const BACKFILL_CHUNK_DAYS = 14;
/** Magnitud mínima del backfill según alcance (volumen razonable). */
const BACKFILL_MAG_FLOOR = { co: 2.5, world: 4.5 } as const;

const backfillLocks = new Map<string, Promise<number>>();

/**
 * Descarga on-demand del historial del USGS para cubrir un rango de fechas
 * pasado que aún no está en la base. No genera alertas: solo persiste datos.
 * Se guardan firstDetectedAt/lastSeenAt = eventTime (evento histórico cerrado).
 */
export async function backfillHistoricalRange(opts: {
  from: Date;
  to: Date;
  scope: 'co' | 'world';
  minMagnitude?: number;
}): Promise<{ fetched: number }> {
  if (env.isTest || !env.backfillEnabled) return { fetched: 0 };

  const now = Date.now();
  const DAY = 86400_000;
  const spanStart = Math.max(opts.from.getTime(), now - BACKFILL_MAX_SPAN_DAYS * DAY);

  const oldest = await Earthquake.findOne({ demo: { $ne: true } })
    .sort({ eventTime: 1 })
    .lean();
  const gapEnd = oldest ? oldest.eventTime.getTime() : opts.to.getTime();

  const from = Math.min(spanStart, gapEnd);
  const to = Math.min(opts.to.getTime(), gapEnd, now);
  if (from >= to) return { fetched: 0 };

  const floor = Math.max(
    opts.minMagnitude ?? 0,
    BACKFILL_MAG_FLOOR[opts.scope],
  );
  const provider = new USGSEarthquakeProvider(env.usgsApiUrl);

  let fetched = 0;
  for (let s = from; s < to; s += BACKFILL_CHUNK_DAYS * DAY) {
    const e = Math.min(s + BACKFILL_CHUNK_DAYS * DAY, to);
    const key = `${new Date(s).toISOString()}_${new Date(e).toISOString()}`;
    let task = backfillLocks.get(key);
    if (!task) {
      task = (async () => {
        const { events } = await provider.getHistoricalEarthquakes({
          start: new Date(s),
          end: new Date(e),
          minMagnitude: floor,
          bbox: opts.scope === 'co' ? COLOMBIA_BBOX : undefined,
        });
        if (events.length > 0) await bulkUpsertHistorical(events);
        return events.length;
      })();
      backfillLocks.set(key, task);
      void task.then(
        () => backfillLocks.delete(key),
        () => backfillLocks.delete(key),
      );
    }
    fetched += await task;
  }
  return { fetched };
}

/** Inserta/actualiza en lote eventos históricos (dedupe por externalId+source). */
async function bulkUpsertHistorical(events: EarthquakeInput[]): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = events.map((e) => ({
    updateOne: {
      filter: { externalId: e.externalId, source: e.source },
      update: {
        $set: {
          magnitude: e.magnitude,
          magnitudeType: e.magnitudeType,
          latitude: e.latitude,
          longitude: e.longitude,
          depth: e.depth,
          place: e.place,
          eventTime: e.eventTime,
          updatedAt: e.updatedAt,
          tsunami: e.tsunami,
          felt: e.felt,
          alertLevel: e.alertLevel,
          status: e.status,
          sourceUrl: e.sourceUrl,
          rawData: e.rawData,
        },
        $setOnInsert: {
          firstDetectedAt: e.eventTime,
          lastSeenAt: e.eventTime,
          demo: false,
        },
      },
      upsert: true,
    },
  }));
  await Earthquake.bulkWrite(ops, { ordered: false });
}

function toResult(doc: unknown): ProcessEarthquakeResult['doc'] {
  const d = doc as {
    _id: mongoose.Types.ObjectId;
    externalId: string;
    source: string;
    magnitude: number;
    latitude: number;
    longitude: number;
    depth: number;
    place: string;
    eventTime: Date;
    firstDetectedAt: Date;
    lastSeenAt: Date;
    demo: boolean;
  };
  return {
    _id: d._id,
    externalId: d.externalId,
    source: d.source,
    magnitude: d.magnitude,
    latitude: d.latitude,
    longitude: d.longitude,
    depth: d.depth,
    place: d.place,
    eventTime: d.eventTime,
    firstDetectedAt: d.firstDetectedAt,
    lastSeenAt: d.lastSeenAt,
    demo: d.demo,
  };
}
