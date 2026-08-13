import { Request, Response } from 'express';
import { Earthquake } from '../models/Earthquake';
import { earthquakeListQuerySchema } from '../validators/validators';
import { ApiError } from '../utils/errors';
import { calculateDistanceKm, COLOMBIA_BBOX, findDepartmentBBox, resolveColombiaLocation } from '../../../shared/src';
import { backfillHistoricalRange } from '../services/earthquakeService';
import { env } from '../config/env';
import { User } from '../models/User';
import type { AuthRequest } from '../middleware/auth';

/**
 * Ubicación de referencia del usuario para calcular distancias:
 * prioriza el GPS (location); si no, la ubicación manual resuelta a
 * coordenadas (o resuelta al vuelo si fue guardada sin ellas).
 * Devuelve null para visitantes anónimos o sin ubicación.
 */
async function getUserLocation(req: AuthRequest): Promise<{ latitude: number; longitude: number } | null> {
  if (!req.user) return null;
  const user = await User.findById(req.user.id).lean();
  if (!user) return null;
  const loc = user.location as { latitude?: number; longitude?: number } | null;
  if (typeof loc?.latitude === 'number' && typeof loc.longitude === 'number') {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }
  const manual = user.locationManual as {
    latitude?: number | null;
    longitude?: number | null;
    department?: string | null;
    municipality?: string | null;
  } | null;
  if (typeof manual?.latitude === 'number' && typeof manual.longitude === 'number') {
    return { latitude: manual.latitude, longitude: manual.longitude };
  }
  if (manual?.department) {
    const resolved = resolveColombiaLocation(manual.department, manual.municipality ?? '');
    if (resolved) return resolved;
  }
  return null;
}

const SOURCE_LABELS: Record<string, string> = {
  sgc: 'Servicio Geológico Colombiano (SGC)',
  usgs: 'USGS (US Geological Survey)',
  mock: 'Fuente simulada (DEMO)',
};

function serialize(doc: Record<string, unknown>, userLocation?: { latitude: number; longitude: number } | null) {
  const d = doc as {
    _id: { toString(): string };
    externalId: string;
    source: string;
    magnitude: number;
    magnitudeType: string;
    latitude: number;
    longitude: number;
    depth: number;
    place: string;
    eventTime: Date;
    tsunami: boolean;
    felt: number | null;
    alertLevel: string | null;
    status: string;
    sourceUrl: string | null;
    firstDetectedAt: Date;
    lastSeenAt: Date;
    demo: boolean;
    rawData: unknown;
  };
  let distanceKm: number | null = null;
  if (userLocation) {
    distanceKm = calculateDistanceKm(d.latitude, d.longitude, userLocation.latitude, userLocation.longitude);
  }
  return {
    id: d._id.toString(),
    externalId: d.externalId,
    source: d.source,
    sourceLabel: SOURCE_LABELS[d.source] ?? d.source,
    magnitude: d.magnitude,
    magnitudeType: d.magnitudeType,
    latitude: d.latitude,
    longitude: d.longitude,
    depth: d.depth,
    place: d.place,
    eventTime: d.eventTime,
    tsunami: d.tsunami,
    felt: d.felt,
    alertLevel: d.alertLevel,
    status: d.status,
    sourceUrl: d.sourceUrl,
    firstDetectedAt: d.firstDetectedAt,
    lastSeenAt: d.lastSeenAt,
    demo: d.demo,
    distanceKm,
    level: mapDisplayLevel(d.alertLevel),
    hasRawData: Boolean(d.rawData),
  };
}

/** Nivel de exhibición derivado SOLO de la alerta oficial de la fuente. */
function mapDisplayLevel(alertLevel: string | null): 'NORMAL' | 'WARNING' | 'HIGH' | 'CRITICAL' | null {
  if (!alertLevel) return null;
  const v = alertLevel.toLowerCase();
  if (v === 'red' || v === 'rojo' || v === 'critical' || v === 'critico') return 'CRITICAL';
  if (v === 'orange' || v === 'naranja') return 'HIGH';
  if (v === 'yellow' || v === 'amarillo') return 'WARNING';
  if (v === 'green' || v === 'verde') return 'NORMAL';
  return null;
}

export async function listEarthquakes(req: AuthRequest, res: Response) {
  const q = earthquakeListQuerySchema.parse(req.query);
  const filter: Record<string, any> = {};
  const userLocation = await getUserLocation(req);

  // Rango histórico no cubierto: descargar on-demand del USGS (no genera alertas).
  if (q.from && !env.isTest) {
    try {
      await backfillHistoricalRange({
        from: new Date(q.from),
        to: q.to ? new Date(q.to) : new Date(),
        scope: (q.scope ?? 'co') === 'world' ? 'world' : 'co',
        minMagnitude: q.minMagnitude,
      });
    } catch (err) {
      console.warn('[backfill] falló la descarga histórica:', err instanceof Error ? err.message : err);
    }
  }

  if (q.from || q.to) {
    filter.eventTime = {};
    if (q.from) filter.eventTime.$gte = new Date(q.from);
    if (q.to) filter.eventTime.$lte = new Date(q.to);
  }
  if (q.minMagnitude !== undefined || q.maxMagnitude !== undefined) {
    filter.magnitude = {};
    if (q.minMagnitude !== undefined) filter.magnitude.$gte = q.minMagnitude;
    if (q.maxMagnitude !== undefined) filter.magnitude.$lte = q.maxMagnitude;
  }
  if (q.source) filter.source = q.source;
  if (q.maxDepth !== undefined || q.minDepth !== undefined) {
    filter.depth = {};
    if (q.maxDepth !== undefined) filter.depth.$lte = q.maxDepth;
    if (q.minDepth !== undefined) filter.depth.$gte = q.minDepth;
  }
  const dept = q.department ? findDepartmentBBox(q.department) : null;
  if (dept) {
    filter.latitude = { $gte: dept.bbox.minLatitude, $lte: dept.bbox.maxLatitude };
    filter.longitude = { $gte: dept.bbox.minLongitude, $lte: dept.bbox.maxLongitude };
  } else if (q.department) {
    filter['place'] = { $regex: q.department, $options: 'i' };
  }
  if (q.municipality) filter['place'] = { $regex: q.municipality, $options: 'i' };

  if ((q.scope ?? 'co') === 'co' && !dept) {
    filter.latitude = { $gte: COLOMBIA_BBOX.minLatitude, $lte: COLOMBIA_BBOX.maxLatitude };
    filter.longitude = { $gte: COLOMBIA_BBOX.minLongitude, $lte: COLOMBIA_BBOX.maxLongitude };
  }

  filter.demo = { $ne: true };
  if (q.source === 'mock') delete filter.demo;

  const [items, total] = await Promise.all([
    Earthquake.find(filter)
      .sort({ eventTime: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Earthquake.countDocuments(filter),
  ]);

  res.json({
    items: items.map((d) => serialize(d as unknown as Record<string, unknown>, userLocation)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize),
  });
}

export async function getEarthquake(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const doc = await Earthquake.findById(id).lean();
  if (!doc) throw ApiError.notFound('Evento sísmico no encontrado');
  const userLocation = await getUserLocation(req);
  res.json({ earthquake: serialize(doc as unknown as Record<string, unknown>, userLocation) });
}

export async function recentEarthquakes(req: AuthRequest, res: Response) {
  const hours = Math.min(parseInt(String(req.query.hours ?? '48'), 10) || 48, 168);
  const since = new Date(Date.now() - hours * 3600_000);
  const scope = req.query.scope === 'world' ? 'world' : 'co';
  const userLocation = await getUserLocation(req);
  const filter: Record<string, any> = {
    eventTime: { $gte: since },
    demo: { $ne: true },
  };
  if (scope === 'co') {
    filter.latitude = { $gte: COLOMBIA_BBOX.minLatitude, $lte: COLOMBIA_BBOX.maxLatitude };
    filter.longitude = { $gte: COLOMBIA_BBOX.minLongitude, $lte: COLOMBIA_BBOX.maxLongitude };
  }
  const items = await Earthquake.find(filter).sort({ eventTime: -1 }).limit(50).lean();
  res.json({
    items: items.map((d) => serialize(d as unknown as Record<string, unknown>, userLocation)),
    hours,
    scope,
  });
}
