import type { EarthquakeInput } from '../../../shared/src';
import type { ProviderResult, EarthquakeProvider } from './types';

export const DEFAULT_USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

/** API FDSN para consultas históricas por rango de fechas. */
export const USGS_FDSN_QUERY_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export interface HistoricalQueryOptions {
  start: Date;
  end: Date;
  minMagnitude?: number;
  bbox?: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * USGS Earthquake API (GeoJSON feeds). Fuente secundaria / fallback.
 * Documentación: https://earthquake.usgs.gov/fdsnws/event/1/
 */
export class USGSEarthquakeProvider implements EarthquakeProvider {
  readonly name = 'usgs';
  readonly label = 'USGS (US Geological Survey)';
  private readonly url: string;

  constructor(url: string) {
    this.url = url?.trim() || DEFAULT_USGS_URL;
  }

  isConfigured(): boolean {
    return Boolean(this.url);
  }

  async getRecentEarthquakes(): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      throw new Error('USGS_API_URL no está configurada');
    }
    return this.fetchEvents(this.url);
  }

  /**
   * Consulta histórica por rango de fechas usando el API FDSN
   * (https://earthquake.usgs.gov/fdsnws/event/1/query).
   * Permite limitar por magnitud y por caja geográfica.
   */
  async getHistoricalEarthquakes(opts: HistoricalQueryOptions): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      throw new Error('USGS_API_URL no está configurada');
    }
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: opts.start.toISOString(),
      endtime: opts.end.toISOString(),
      orderby: 'time',
    });
    if (opts.minMagnitude !== undefined) params.set('minmagnitude', String(opts.minMagnitude));
    if (opts.bbox) {
      params.set('minlatitude', String(opts.bbox.minLatitude));
      params.set('maxlatitude', String(opts.bbox.maxLatitude));
      params.set('minlongitude', String(opts.bbox.minLongitude));
      params.set('maxlongitude', String(opts.bbox.maxLongitude));
    }
    return this.fetchEvents(`${USGS_FDSN_QUERY_URL}?${params.toString()}`);
  }

  private async fetchEvents(url: string): Promise<ProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json', 'user-agent': 'AlertaSimica/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new Error(`USGS respondió ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { features?: unknown[]; metadata?: unknown };
    if (!Array.isArray(data.features)) {
      throw new Error('Respuesta USGS sin formato esperado (features)');
    }
    const events = data.features
      .map((f) => this.normalize(f))
      .filter((e): e is EarthquakeInput => e !== null);
    return { events, queriedUrl: url };
  }

  private normalize(feature: unknown): EarthquakeInput | null {
    const f = feature as {
      id?: unknown;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown; type?: string };
    };
    const p = f.properties ?? {};
    const geom = f.geometry?.coordinates;
    if (!Array.isArray(geom) || geom.length < 3) return null;

    const [longitude, latitude, depth] = geom as [number, number, number];
    if (num(longitude) === null || num(latitude) === null) return null;

    const magnitude = num(p.mag);
    if (magnitude === null) return null;

    const eventTime = typeof p.time === 'number' ? new Date(p.time) : new Date(String(p.time));
    const updatedAt = typeof p.updated === 'number' ? new Date(p.updated) : new Date();

    const statusRaw = String(p.status ?? 'automatic').toLowerCase();
    const statusMap: Record<string, EarthquakeInput['status']> = {
      automatic: 'automatic',
      reviewed: 'reviewed',
      deleted: 'deleted',
      preliminary: 'preliminary',
    };
    const status = statusMap[statusRaw] ?? 'automatic';

    const felt = num(p.felt);

    return {
      externalId: String(f.id ?? `${p.net}-${p.code}`),
      source: this.name,
      magnitude,
      magnitudeType: typeof p.magType === 'string' ? p.magType : '',
      latitude,
      longitude,
      depth: Math.max(0, depth),
      place: typeof p.place === 'string' ? p.place : 'Evento sísmico',
      eventTime,
      updatedAt,
      tsunami: p.tsunami === 1 || p.tsunami === true,
      felt,
      alertLevel: typeof p.alert === 'string' && p.alert !== '' ? p.alert : null,
      status,
      sourceUrl: typeof p.url === 'string' ? p.url : null,
      rawData: feature,
    };
  }
}
