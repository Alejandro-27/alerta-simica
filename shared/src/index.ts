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
  locationManual: {
    country: string;
    department: string;
    municipality: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
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

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/**
 * Cajas delimitadoras APROXIMADAS de cada departamento de Colombia.
 * Útiles para filtrar eventos por coordenadas (lat/lng) cuando el texto
 * del lugar no menciona el departamento (p. ej. datos del USGS).
 * Los límites son holgados y pueden solaparse entre departamentos vecinos.
 */
export const DEPARTMENT_BBOXES: Record<string, BoundingBox> = {
  'Amazonas': { minLatitude: -4.5, maxLatitude: -0.5, minLongitude: -74.8, maxLongitude: -69.5 },
  'Antioquia': { minLatitude: 5.4, maxLatitude: 8.9, minLongitude: -77.0, maxLongitude: -73.8 },
  'Arauca': { minLatitude: 6.0, maxLatitude: 7.2, minLongitude: -72.3, maxLongitude: -69.5 },
  'Atlántico': { minLatitude: 10.3, maxLatitude: 11.1, minLongitude: -75.2, maxLongitude: -74.7 },
  'Bogotá D.C.': { minLatitude: 4.4, maxLatitude: 4.9, minLongitude: -74.2, maxLongitude: -73.9 },
  'Bolívar': { minLatitude: 7.8, maxLatitude: 10.3, minLongitude: -75.0, maxLongitude: -73.5 },
  'Boyacá': { minLatitude: 4.6, maxLatitude: 7.1, minLongitude: -74.5, maxLongitude: -71.5 },
  'Caldas': { minLatitude: 4.9, maxLatitude: 5.6, minLongitude: -75.9, maxLongitude: -74.7 },
  'Caquetá': { minLatitude: -0.5, maxLatitude: 2.5, minLongitude: -76.5, maxLongitude: -71.5 },
  'Casanare': { minLatitude: 4.2, maxLatitude: 6.4, minLongitude: -73.2, maxLongitude: -69.5 },
  'Cauca': { minLatitude: 1.3, maxLatitude: 3.4, minLongitude: -78.0, maxLongitude: -75.5 },
  'Cesar': { minLatitude: 7.5, maxLatitude: 10.9, minLongitude: -74.3, maxLongitude: -72.7 },
  'Chocó': { minLatitude: 3.8, maxLatitude: 8.7, minLongitude: -77.9, maxLongitude: -75.5 },
  'Córdoba': { minLatitude: 7.2, maxLatitude: 9.4, minLongitude: -76.8, maxLongitude: -74.7 },
  'Cundinamarca': { minLatitude: 3.9, maxLatitude: 5.8, minLongitude: -75.0, maxLongitude: -73.0 },
  'Guainía': { minLatitude: 1.0, maxLatitude: 4.2, minLongitude: -70.8, maxLongitude: -66.5 },
  'Guaviare': { minLatitude: 0.5, maxLatitude: 3.2, minLongitude: -74.0, maxLongitude: -70.0 },
  'Huila': { minLatitude: 1.5, maxLatitude: 3.9, minLongitude: -76.4, maxLongitude: -74.5 },
  'La Guajira': { minLatitude: 10.4, maxLatitude: 12.5, minLongitude: -73.6, maxLongitude: -71.0 },
  'Magdalena': { minLatitude: 8.8, maxLatitude: 11.3, minLongitude: -74.9, maxLongitude: -73.2 },
  'Meta': { minLatitude: 1.6, maxLatitude: 4.9, minLongitude: -74.4, maxLongitude: -69.8 },
  'Nariño': { minLatitude: 0.1, maxLatitude: 2.8, minLongitude: -79.0, maxLongitude: -76.8 },
  'Norte de Santander': { minLatitude: 6.9, maxLatitude: 9.3, minLongitude: -73.6, maxLongitude: -71.8 },
  'Putumayo': { minLatitude: -0.6, maxLatitude: 1.5, minLongitude: -77.4, maxLongitude: -74.2 },
  'Quindío': { minLatitude: 4.2, maxLatitude: 4.7, minLongitude: -75.8, maxLongitude: -75.3 },
  'Risaralda': { minLatitude: 4.6, maxLatitude: 5.6, minLongitude: -76.3, maxLongitude: -75.4 },
  'San Andrés y Providencia': { minLatitude: 12.3, maxLatitude: 13.5, minLongitude: -82.1, maxLongitude: -81.2 },
  'Santander': { minLatitude: 5.7, maxLatitude: 8.3, minLongitude: -74.5, maxLongitude: -72.0 },
  'Sucre': { minLatitude: 8.3, maxLatitude: 10.0, minLongitude: -75.8, maxLongitude: -74.6 },
  'Tolima': { minLatitude: 3.0, maxLatitude: 5.5, minLongitude: -76.0, maxLongitude: -74.4 },
  'Valle del Cauca': { minLatitude: 3.1, maxLatitude: 5.1, minLongitude: -77.8, maxLongitude: -75.7 },
  'Vaupés': { minLatitude: -0.5, maxLatitude: 2.0, minLongitude: -71.5, maxLongitude: -69.0 },
  'Vichada': { minLatitude: 3.0, maxLatitude: 6.4, minLongitude: -70.8, maxLongitude: -66.5 },
};

/** Normaliza un nombre de departamento: minúsculas y sin tildes. */
export function normalizeDepartmentName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca la caja delimitadora de un departamento por nombre (acepta
 * coincidencias parciales, p. ej. "Bogot" → "Bogotá D.C.").
 * Devuelve null si no se reconoce.
 */
export function findDepartmentBBox(query: string): { name: string; bbox: BoundingBox } | null {
  const q = normalizeDepartmentName(query);
  if (!q) return null;
  for (const [name, bbox] of Object.entries(DEPARTMENT_BBOXES)) {
    const key = normalizeDepartmentName(name);
    if (key === q || key.startsWith(q) || q.startsWith(key)) return { name, bbox };
  }
  return null;
}

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

/**
 * Coordenadas aproximadas (lat, lng) de los principales municipios de
 * Colombia. Se usan para calcular distancias cuando el usuario registra su
 * ubicación de forma manual (sin GPS). Precisión de referencia, no catastral.
 */
export const COLOMBIA_MUNICIPALITY_COORDS: Record<string, GeoCoords> = {
  // Bogotá D.C. / Cundinamarca
  'Bogotá': { latitude: 4.711, longitude: -74.072 },
  'Soacha': { latitude: 4.579, longitude: -74.217 },
  'Zipaquirá': { latitude: 5.024, longitude: -74.004 },
  'Facatativá': { latitude: 4.814, longitude: -74.357 },
  'Girardot': { latitude: 4.303, longitude: -74.8 },
  'Chía': { latitude: 4.859, longitude: -74.059 },
  'Cajicá': { latitude: 4.918, longitude: -74.028 },
  'Fusagasugá': { latitude: 4.345, longitude: -74.364 },
  'Mosquera': { latitude: 4.706, longitude: -74.233 },
  'Madrid': { latitude: 4.732, longitude: -74.264 },
  // Antioquia
  'Medellín': { latitude: 6.244, longitude: -75.573 },
  'Bello': { latitude: 6.337, longitude: -75.558 },
  'Itagüí': { latitude: 6.172, longitude: -75.611 },
  'Envigado': { latitude: 6.176, longitude: -75.593 },
  'Rionegro': { latitude: 6.154, longitude: -75.373 },
  'Apartadó': { latitude: 7.884, longitude: -76.626 },
  'Turbo': { latitude: 8.093, longitude: -76.728 },
  'Sonsón': { latitude: 5.71, longitude: -75.31 },
  'Amagá': { latitude: 6.04, longitude: -75.703 },
  'Jericó': { latitude: 5.792, longitude: -75.786 },
  // Valle del Cauca
  'Cali': { latitude: 3.452, longitude: -76.532 },
  'Palmira': { latitude: 3.539, longitude: -76.303 },
  'Buenaventura': { latitude: 3.877, longitude: -77.02 },
  'Tuluá': { latitude: 4.086, longitude: -76.197 },
  'Buga': { latitude: 3.9, longitude: -76.301 },
  'Cartago': { latitude: 4.746, longitude: -75.912 },
  'Jamundí': { latitude: 3.264, longitude: -76.544 },
  'El Cerrito': { latitude: 3.685, longitude: -76.31 },
  'Dagua': { latitude: 3.657, longitude: -76.688 },
  'Ansermanuevo': { latitude: 4.798, longitude: -75.994 },
  // Santander
  'Bucaramanga': { latitude: 7.119, longitude: -73.123 },
  'Floridablanca': { latitude: 7.063, longitude: -73.086 },
  'Girón': { latitude: 7.07, longitude: -73.171 },
  'Piedecuesta': { latitude: 6.99, longitude: -73.053 },
  'Barrancabermeja': { latitude: 7.068, longitude: -73.851 },
  'Zapatoca': { latitude: 6.815, longitude: -73.268 },
  'San Gil': { latitude: 6.558, longitude: -73.134 },
  'Socorro': { latitude: 6.468, longitude: -73.26 },
  // Boyacá
  'Tunja': { latitude: 5.535, longitude: -73.368 },
  'Duitama': { latitude: 5.827, longitude: -73.031 },
  'Sogamoso': { latitude: 5.716, longitude: -72.935 },
  'Chiquinquirá': { latitude: 5.619, longitude: -73.818 },
  'Paipa': { latitude: 5.78, longitude: -73.117 },
  'Miraflores': { latitude: 5.195, longitude: -73.144 },
  'Moniquirá': { latitude: 5.877, longitude: -73.57 },
  // Caldas
  'Manizales': { latitude: 5.07, longitude: -75.517 },
  'Villamaría': { latitude: 5.044, longitude: -75.515 },
  'Chinchiná': { latitude: 4.982, longitude: -75.605 },
  'La Dorada': { latitude: 5.45, longitude: -74.667 },
  'Riosucio': { latitude: 5.421, longitude: -75.706 },
  'Neira': { latitude: 5.165, longitude: -75.517 },
  // Quindío
  'Armenia': { latitude: 4.534, longitude: -75.681 },
  'Calarcá': { latitude: 4.529, longitude: -75.641 },
  'Salento': { latitude: 4.637, longitude: -75.571 },
  'Filandia': { latitude: 4.673, longitude: -75.659 },
  'Montenegro': { latitude: 4.565, longitude: -75.749 },
  'Quimbaya': { latitude: 4.628, longitude: -75.764 },
  // Risaralda
  'Pereira': { latitude: 4.813, longitude: -75.696 },
  'Dosquebradas': { latitude: 4.835, longitude: -75.677 },
  'Santa Rosa de Cabal': { latitude: 4.868, longitude: -75.621 },
  'La Virginia': { latitude: 4.889, longitude: -75.886 },
  'Quinchía': { latitude: 5.34, longitude: -75.731 },
  // Tolima
  'Ibagué': { latitude: 4.439, longitude: -75.232 },
  'Espinal': { latitude: 4.149, longitude: -74.89 },
  'Melgar': { latitude: 4.205, longitude: -74.642 },
  'Líbano': { latitude: 4.922, longitude: -75.063 },
  'Chaparral': { latitude: 3.724, longitude: -75.484 },
  'Honda': { latitude: 5.207, longitude: -74.737 },
  // Huila
  'Neiva': { latitude: 2.927, longitude: -75.282 },
  'Pitalito': { latitude: 1.854, longitude: -76.051 },
  'Garzón': { latitude: 2.197, longitude: -75.63 },
  'La Plata': { latitude: 2.391, longitude: -75.892 },
  'Campoalegre': { latitude: 2.684, longitude: -75.323 },
  // Meta
  'Villavicencio': { latitude: 4.142, longitude: -73.627 },
  'Acacías': { latitude: 3.987, longitude: -73.758 },
  'Granada': { latitude: 3.545, longitude: -73.707 },
  'Puerto López': { latitude: 4.09, longitude: -72.957 },
  'El Calvario': { latitude: 4.352, longitude: -73.71 },
  'San Martín': { latitude: 3.697, longitude: -73.7 },
  // Nariño
  'Pasto': { latitude: 1.214, longitude: -77.279 },
  'Tumaco': { latitude: 1.791, longitude: -78.792 },
  'Ipiales': { latitude: 0.825, longitude: -77.641 },
  'Túquerres': { latitude: 1.089, longitude: -77.618 },
  'Barbacoas': { latitude: 1.672, longitude: -78.145 },
  // Cauca
  'Popayán': { latitude: 2.441, longitude: -76.607 },
  'Santander de Quilichao': { latitude: 3.013, longitude: -76.485 },
  'Puerto Tejada': { latitude: 3.232, longitude: -76.417 },
  'Timbío': { latitude: 2.353, longitude: -76.683 },
  // Atlántico
  'Barranquilla': { latitude: 10.969, longitude: -74.781 },
  'Soledad': { latitude: 10.917, longitude: -74.765 },
  'Malambo': { latitude: 10.859, longitude: -74.775 },
  'Puerto Colombia': { latitude: 11.009, longitude: -74.955 },
  // Magdalena
  'Santa Marta': { latitude: 11.241, longitude: -74.199 },
  'Ciénaga': { latitude: 11.006, longitude: -74.251 },
  'Fundación': { latitude: 10.518, longitude: -74.19 },
  'Aracataca': { latitude: 10.594, longitude: -74.184 },
  // Córdoba
  'Montería': { latitude: 8.748, longitude: -75.881 },
  'Cereté': { latitude: 8.887, longitude: -75.791 },
  'Lorica': { latitude: 9.233, longitude: -75.815 },
  'Tierralta': { latitude: 8.169, longitude: -76.06 },
  // Bolívar
  'Cartagena': { latitude: 10.391, longitude: -75.479 },
  'Magangué': { latitude: 9.239, longitude: -74.752 },
  'Turbaco': { latitude: 10.333, longitude: -75.415 },
  'El Carmen de Bolívar': { latitude: 9.717, longitude: -75.126 },
  // La Guajira
  'Riohacha': { latitude: 11.544, longitude: -72.907 },
  'Maicao': { latitude: 11.38, longitude: -72.244 },
  'Uribia': { latitude: 11.715, longitude: -72.266 },
  'San Juan del Cesar': { latitude: 10.769, longitude: -73.006 },
  // Cesar
  'Valledupar': { latitude: 10.476, longitude: -73.247 },
  'Aguachica': { latitude: 8.31, longitude: -73.617 },
  'Codazzi': { latitude: 10.031, longitude: -73.241 },
  'La Paz': { latitude: 10.387, longitude: -73.177 },
  // Norte de Santander
  'Cúcuta': { latitude: 7.894, longitude: -72.504 },
  'Ocaña': { latitude: 8.237, longitude: -73.354 },
  'Pamplona': { latitude: 7.377, longitude: -72.648 },
  'Los Patios': { latitude: 7.843, longitude: -72.507 },
  // Arauca
  'Arauca': { latitude: 7.084, longitude: -70.759 },
  'Saravena': { latitude: 6.959, longitude: -71.875 },
  'Tame': { latitude: 6.459, longitude: -71.747 },
  // Casanare
  'Yopal': { latitude: 5.339, longitude: -72.394 },
  'Aguazul': { latitude: 5.173, longitude: -72.548 },
  'Villanueva': { latitude: 4.612, longitude: -72.929 },
  // Sucre
  'Sincelejo': { latitude: 9.299, longitude: -75.397 },
  'Corozal': { latitude: 9.324, longitude: -75.292 },
  'Sampués': { latitude: 9.183, longitude: -75.378 },
  // Chocó
  'Quibdó': { latitude: 5.692, longitude: -76.658 },
  'Istmina': { latitude: 5.157, longitude: -76.687 },
  'Acandí': { latitude: 8.514, longitude: -77.273 },
  'Bahía Solano': { latitude: 6.23, longitude: -77.404 },
  'Nuquí': { latitude: 5.706, longitude: -77.266 },
  // Caquetá
  'Florencia': { latitude: 1.614, longitude: -75.606 },
  'San Vicente del Caguán': { latitude: 2.115, longitude: -74.765 },
  // Putumayo
  'Mocoa': { latitude: 1.148, longitude: -76.646 },
  'Puerto Asís': { latitude: 0.505, longitude: -76.5 },
  'Orito': { latitude: 0.669, longitude: -76.874 },
  // Amazonas, Guainía, Guaviare, Vaupés, Vichada
  'Leticia': { latitude: -4.215, longitude: -69.941 },
  'Inírida': { latitude: 3.866, longitude: -67.924 },
  'San José del Guaviare': { latitude: 2.567, longitude: -72.639 },
  'Mitú': { latitude: 1.253, longitude: -70.234 },
  'Puerto Carreño': { latitude: 6.189, longitude: -67.487 },
  // San Andrés y Providencia
  'San Andrés': { latitude: 12.585, longitude: -81.7 },
  'Providencia': { latitude: 13.375, longitude: -81.366 },
};

/** Centro aproximado de un departamento (promedio de su caja). */
export function departmentCenter(department: string): GeoCoords | null {
  const bbox = DEPARTMENT_BBOXES[department];
  if (!bbox) return null;
  return {
    latitude: (bbox.minLatitude + bbox.maxLatitude) / 2,
    longitude: (bbox.minLongitude + bbox.maxLongitude) / 2,
  };
}

/**
 * Resuelve coordenadas para una ubicación manual en Colombia:
 * municipio conocido → sus coordenadas; si no, centro del departamento;
 * si nada coincide → null.
 */
export function resolveColombiaLocation(
  department: string,
  municipality: string,
): GeoCoords | null {
  const mun = COLOMBIA_MUNICIPALITY_COORDS[municipality?.trim() ?? ''];
  if (mun) return mun;
  return departmentCenter(department);
}

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
  /** Clase de token semántico: sev-low | sev-moderate | sev-strong | sev-critical. */
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
    color: 'sev-critical',
  },
  {
    min: 5.0,
    label: 'Fuerte',
    shortLabel: 'Fuerte',
    description:
      'Todos lo perciben en la zona cercana; objetos pueden caerse. La intensidad depende de la distancia y de la construcción.',
    color: 'sev-strong',
  },
  {
    min: 3.9,
    label: 'Moderado',
    shortLabel: 'Moderado',
    description:
      'Se siente como el paso de un camión pesado; en general no causa daños, aunque puede asustar a quienes están cerca.',
    color: 'sev-moderate',
  },
  {
    min: 0,
    label: 'Bajo',
    shortLabel: 'Bajo',
    description:
      'Sismo de baja magnitud; por lo general no se siente o se percibe apenas si estás muy cerca del epicentro.',
    color: 'sev-low',
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
