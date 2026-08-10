import mongoose from 'mongoose';
import { Earthquake } from '../models/Earthquake';
import type { EarthquakeInput } from '../../../shared/src';

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
