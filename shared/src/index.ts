export type UserRole = 'ADMIN' | 'USER';

export type AlertLevel = 'NORMAL' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type EarthquakeStatus =
  | 'automatic'
  | 'reviewed'
  | 'deleted'
  | 'preliminary'
  | 'unprocessed';

export type NotificationType =
  | 'EARTHQUAKE_DETECTED'
  | 'EARTHQUAKE_ALERT'
  | 'SYSTEM_NOTIFICATION'
  | 'TEST_NOTIFICATION';

export type SourceStatusValue = 'up' | 'down' | 'disabled' | 'misconfigured';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface EarthquakeInput {
  externalId: string;
  source: string;
  magnitude: number;
  magnitudeType: string;
  latitude: number;
  longitude: number;
  depth: number;
  place: string;
  eventTime: Date;
  updatedAt: Date;
  tsunami: boolean;
  felt: number | null;
  alertLevel: string | null;
  status: EarthquakeStatus;
  sourceUrl: string | null;
  rawData: unknown;
}

export interface EarthquakeRecord {
  id: string;
  externalId: string;
  source: string;
  sourceLabel: string;
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
  distanceKm: number | null;
  level: AlertLevel | null;
  hasRawData: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: Date;
}

export interface AlertSettings {
  enabled: boolean;
  minimumMagnitude: number;
  alertRadiusKm: number;
  nearbyAlerts: boolean;
  nationalAlerts: boolean;
  soundEnabled: boolean;
  dailySummary: boolean;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone: string | null;
  location: UserLocation | null;
  locationManual: { country: string; department: string; municipality: string } | null;
  alertSettings: AlertSettings;
  pushEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertConfigurationPublic {
  minimumMagnitude: number;
  maximumDepth: number | null;
  alertRadiusKm: number;
  highMagnitudeThreshold: number;
  enabled: boolean;
  country: string;
  regions: string[];
  cities: string[];
  sources: Record<string, { enabled: boolean }>;
  pollIntervalSeconds: number;
  updatedAt: Date;
}

export interface SourceStatusPublic {
  source: string;
  status: SourceStatusValue;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  lastEventAt: Date | null;
  eventsFound: number;
  processingTimeMs: number | null;
}

export interface PushPayload {
  type: NotificationType;
  eventId?: string;
  title: string;
  body: string;
  url: string;
  magnitude?: number;
  distanceKm?: number;
}

export interface PushSubscriptionPublic {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  device: string | null;
  browser: string | null;
  platform: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  active: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  earthquakeSources: Record<string, SourceStatusValue>;
  push: 'configured' | 'not_configured';
  timestamp: string;
}

export const APP_NAME = 'AlertaSísmica';
export const APP_SLOGAN = 'Monitoreo sísmico en tiempo real';

export const DEFAULT_ALERT_RADIUS_KM = 100;
export const DEFAULT_MIN_MAGNITUDE = 4.5;
export const DEFAULT_MAX_DEPTH_KM = 200;

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  NORMAL: 'Información sísmica',
  WARNING: 'Evento sísmico detectado cerca de tu ubicación',
  HIGH: 'Posible afectación sísmica en tu zona',
  CRITICAL: 'Alerta crítica (fuente oficial)',
};

export const ALERT_LEVEL_BADGES: Record<AlertLevel, { label: string; color: string }> = {
  NORMAL: { label: 'Información', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  WARNING: { label: 'Cerca de ti', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  HIGH: { label: 'Posible afectación', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  CRITICAL: { label: 'Crítico', color: 'bg-red-600/15 text-red-300 border-red-500/30' },
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  EARTHQUAKE_DETECTED: 'Evento sísmico detectado',
  EARTHQUAKE_ALERT: 'Alerta de posible afectación',
  SYSTEM_NOTIFICATION: 'Notificación del sistema',
  TEST_NOTIFICATION: 'Notificación de prueba',
};

/** Círculo de confianza sobre el sistema: NO garantiza alerta temprana. */
export const DISCLAIMER_TEXT =
  'Este sistema proporciona información y alertas basadas en fuentes sísmicas externas. No sustituye los sistemas oficiales de gestión del riesgo ni garantiza recibir una alerta antes de percibir un sismo.';

/** Región aproximada de Colombia para el mapa. */
export const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-4.5, -81.5],
  [13.5, -66.5],
];

export const COLOMBIA_CENTER: [number, number] = [4.2, -73.0];

/**
 * Caja delimitadora aproximada de Colombia para filtrar eventos por alcance
 * (límite marítimo holgado: incluye costa Pacífica/Caribe y San Andrés).
 */
export const COLOMBIA_BBOX = {
  minLatitude: -4.5,
  maxLatitude: 14.0,
  minLongitude: -82.0,
  maxLongitude: -66.0,
};

/** Alcance geográfico de una consulta de eventos. */
export type EarthquakeScope = 'co' | 'world';


/** Departamentos de Colombia (para selección manual de ubicación). */
export const COLOMBIA_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
  'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
  'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
  'Bogotá D.C.',
];

/** Distancia entre dos puntos geográficos en kilómetros (fórmula de Haversine). */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(d);
}

export function formatDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatMagnitude(mag: number | null | undefined): string {
  if (mag === null || mag === undefined) return 'N/D';
  return mag.toFixed(1);
}

/** Tiempo relativo en español, p. ej. "hace 5 min" o "hace 2 h". */
export function formatRelativeTime(iso: string | Date, now: Date = new Date()): string {
  const t = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = Math.max(0, now.getTime() - t.getTime());
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(t);
}

export type SeverityLevel = 'low' | 'moderate' | 'strong' | 'very_strong';

export interface SeverityInfo {
  level: SeverityLevel;
  label: string;
  /** Texto muy corto para chips/insignias. */
  shortLabel: string;
  /** Descripción en lenguaje claro de lo que se siente (sin prometer daños). */
  description: string;
  color: string;
}

/** Descripción sencilla de la profundidad de un sismo. */
export function depthCategory(depthKm: number): {
  label: string;
  shortLabel: string;
} {
  if (depthKm < 70) return { label: 'Superficial (menos de 70 km)', shortLabel: 'Superficial' };
  if (depthKm <= 300) return { label: 'Intermedia (70 a 300 km)', shortLabel: 'Intermedia' };
  return { label: 'Profunda (más de 300 km)', shortLabel: 'Profunda' };
}

const SEVERITY_MAP: Array<{
  min: number;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}> = [
  {
    min: 6.5,
    label: 'Muy fuerte',
    shortLabel: 'Muy fuerte',
    description:
      'Sismo de gran magnitud que el público puede percibir con fuerza; puede haber daños estructurales según la distancia al epicentro.',
    color: 'text-red-300 bg-red-500/15 border-red-500/40',
  },
  {
    min: 5.0,
    label: 'Fuerte',
    shortLabel: 'Fuerte',
    description:
      'Todos lo perciben en la zona cercana; objetos pueden caerse. La intensidad depende de la distancia y de la construcción.',
    color: 'text-orange-300 bg-orange-500/15 border-orange-500/40',
  },
  {
    min: 3.9,
    label: 'Moderado',
    shortLabel: 'Moderado',
    description:
      'Se siente como el paso de un camión pesado; en general no causa daños, aunque puede asustar a quienes están cerca.',
    color: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
  },
  {
    min: 0,
    label: 'Bajo',
    shortLabel: 'Bajo',
    description:
      'Sismo de baja magnitud; por lo general no se siente o se percibe apenas si estás muy cerca del epicentro.',
    color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
  },
];

/**
 * Clasifica un sismo en una escala sencilla de severidad para el público general,
 * combinando magnitud y profundidad. No predice daños: solo orienta la percepción.
 */
export function severityFromEvent(e: { magnitude: number; depth: number }): SeverityInfo {
  for (const level of SEVERITY_MAP) {
    if (e.magnitude >= level.min) {
      return {
        level: level.min >= 6.5 ? 'very_strong' : level.min >= 5 ? 'strong' : level.min >= 3.9 ? 'moderate' : 'low',
        label: level.label,
        shortLabel: level.shortLabel,
        description: level.description,
        color: level.color,
      };
    }
  }
  const low = SEVERITY_MAP[SEVERITY_MAP.length - 1];
  return {
    level: 'low',
    label: low.label,
    shortLabel: low.shortLabel,
    description: low.description,
    color: low.color,
  };
}
