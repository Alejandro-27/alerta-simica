import type { EarthquakeInput } from '../../../shared/src';
import type { ProviderResult, EarthquakeProvider } from './types';

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Servicio Geológico Colombiano (SGC).
 *
 * El SGC no publica un endpoint REST público estable y documentado para
 * "últimos sismos" al momento de escribir esto. Por eso este adaptador:
 *  - NO inventa URLs: la URL real se configura con la variable SGC_API_URL.
 *  - Acepta tres formatos de respuesta (para tolerar el formato real):
 *      1. GeoJSON FeatureCollection  -> features[].properties + geometry
 *      2. ArcGIS FeatureServer JSON  -> features[].attributes + geometry
 *      3. Arreglo plano de objetos   -> [ { ... } ]
 *  - Si SGC_API_URL queda vacía, la fuente reporta "misconfigured" y el
 *    sistema sigue funcionando con las demás fuentes.
 *
 * Formatos de atributos reconocidos (mapeo flexible, en minúsculas):
 *   magnitude: magnitud, magnitud, mag, ml, mw
 *   depth:     profundidad, profundidadKm, depth
 *   place:     lugar, municipio, region, place
 *   eventTime: fecha, fechaHora, tiempo, horaLocal, time, eventTime
 *   lat/lon:   latitud/longitud, latitude/longitude, lat/lon, y/x
 */
export class SGCEarthquakeProvider implements EarthquakeProvider {
  readonly name = 'sgc';
  readonly label = 'Servicio Geológico Colombiano (SGC)';
  private readonly url: string;

  constructor(url: string) {
    this.url = url?.trim() ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.url);
  }

  async getRecentEarthquakes(): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      throw new Error('SGC_API_URL no está configurada');
    }
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(this.url, {
        signal: controller.signal,
        headers: { accept: 'application/json, text/plain', 'user-agent': 'AlertaSimica/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new Error(`SGC respondió ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const events = this.parse(data).filter((e): e is EarthquakeInput => e !== null);
    return { events, queriedUrl: this.url };
  }

  getEarthquakeById(externalId: string): Promise<EarthquakeInput | null> {
    // El SGC no expone un endpoint por id estable; consultamos el feed reciente.
    return this.getRecentEarthquakes().then((r) => {
      const found = r.events.find((e) => e.externalId === externalId);
      return found ?? null;
    });
  }

  private parse(data: unknown): (EarthquakeInput | null)[] {
    if (Array.isArray(data)) {
      return data.map((item) => this.fromFlatObject(item));
    }
    const anyData = data as Record<string, unknown>;
    const features = anyData?.features;
    if (Array.isArray(features)) {
      // GeoJSON o ArcGIS FeatureServer.
      return features.map((f) => this.fromFeature(f));
    }
    const records = anyData?.records ?? anyData?.result ?? anyData?.data;
    if (Array.isArray(records)) {
      return records.map((item) => this.fromFlatObject(item));
    }
    throw new Error('Formato de respuesta SGC no reconocido');
  }

  private fromFeature(feature: unknown): EarthquakeInput | null {
    const f = feature as {
      properties?: Record<string, unknown>;
      attributes?: Record<string, unknown>;
      geometry?: { coordinates?: unknown; x?: unknown; y?: unknown };
    };
    const props = (f.properties ?? f.attributes ?? {}) as Record<string, unknown>;
    const geom = f.geometry ?? {};
    const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [];
    const lon =
      num(geom.x) ?? (coords[0] !== undefined ? num(coords[0]) : null);
    const lat =
      num(geom.y) ?? (coords[1] !== undefined ? num(coords[1]) : null);
    const depthRaw = coords[2] !== undefined ? num(coords[2]) : null;
    if (lon === null || lat === null) return null;
    return this.fromFields(
      { ...props, longitude: lon, latitude: lat, depth: depthRaw },
      feature,
    );
  }

  private fromFlatObject(item: unknown): EarthquakeInput | null {
    const obj = item as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return null;
    return this.fromFields(obj, item);
  }

  private fromFields(obj: Record<string, unknown>, raw: unknown): EarthquakeInput | null {
    const low: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      low[String(k).toLowerCase().replace(/[^a-zñ0-9]/g, '')] = v;
    }

    const magnitude =
      num(low.magnitud) ??
      num(low.magnitude) ??
      num(low.mag) ??
      num(low.ml) ??
      num(low.mw);
    if (magnitude === null) return null;

    const latitude =
      num(low.latitud) ?? num(low.latitude) ?? num(low.lat) ?? num(low.y);
    const longitude =
      num(low.longitud) ?? num(low.longitude) ?? num(low.lon) ?? num(low.lng) ?? num(low.x);
    if (latitude === null || longitude === null) return null;

    const depth =
      num(low.profundidad) ??
      num(low.profundidadkm) ??
      num(low.depth) ??
      num(low.profundidadm) ??
      num(low.z) ??
      0;

    const place =
      str(low.lugar) || str(low.municipio) || str(low.region) || str(low.place) || 'Colombia';

    const eventTime = this.parseDate(
      low.fecha ?? low.fechahora ?? low.fechayhora ?? low.tiempo ?? low.horalocal ?? low.time,
    ) ?? new Date();

    const externalId =
      str(low.idsismo) ||
      str(low.id) ||
      str(low.identificador) ||
      str(low.externalid) ||
      `sgc-${eventTime.getTime()}-${magnitude}-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;

    const statusRaw = str(low.estado ?? low.status).toLowerCase();
    const statusMap: Record<string, EarthquakeInput['status']> = {
      automatico: 'automatic',
      automatic: 'automatic',
      revisado: 'reviewed',
      reviewed: 'reviewed',
      preliminar: 'preliminary',
      preliminary: 'preliminary',
    };
    const status = statusMap[statusRaw] ?? 'automatic';

    return {
      externalId: String(externalId),
      source: this.name,
      magnitude,
      magnitudeType: str(low.tipomagnitud ?? low.magnitudetype ?? low.tipo),
      latitude,
      longitude,
      depth: Math.max(0, depth),
      place,
      eventTime,
      updatedAt: this.parseDate(low.actualizacion ?? low.updated) ?? new Date(),
      tsunami: low.tsunami === 1 || low.tsunami === true || low.tsunami === '1',
      felt: num(low.felt),
      alertLevel:
        typeof low.nivelalerta === 'string' && low.nivelalerta !== ''
          ? (low.nivelalerta as string)
          : null,
      status,
      sourceUrl: typeof low.url === 'string' ? (low.url as string) : null,
      rawData: raw,
    };
  }

  private parseDate(value: unknown): Date | null {
    if (typeof value === 'number') return new Date(value);
    if (typeof value !== 'string') return null;
    const clean = value.trim();
    if (!clean) return null;
    // ArcGIS usa "2023-08-17T12:04:09.000Z" o "/Date(12345)/" o "17/08/2023 12:04:09"
    const arcgisMatch = clean.match(/\/Date\((\d+)\)\//);
    if (arcgisMatch) return new Date(parseInt(arcgisMatch[1], 10));
    const d = new Date(clean);
    if (!Number.isNaN(d.getTime())) return d;
    // Formato dd/mm/yyyy hh:mm:ss (frecuente en el SGC)
    const slash = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (slash) {
      const [, dd, mm, yyyy, hh, mi, ss] = slash;
      return new Date(
        Date.UTC(
          parseInt(yyyy, 10),
          parseInt(mm, 10) - 1,
          parseInt(dd, 10),
          parseInt(hh ?? '0', 10) + 5, // hora local Colombia (UTC-5) => UTC
          parseInt(mi ?? '0', 10),
          parseInt(ss ?? '0', 10),
        ),
      );
    }
    return null;
  }
}
