import type { EarthquakeInput } from '../../../shared/src';

/** Resultado de una consulta a una fuente sísmica. */
export interface ProviderResult {
  events: EarthquakeInput[];
  /** URL de la que se obtuvieron los datos (para auditoría). */
  queriedUrl: string;
}

/** Interfaz común para todas las fuentes sísmicas externas. */
export interface EarthquakeProvider {
  readonly name: string;
  /** Nombre amigable para mostrar. */
  readonly label: string;
  /** Si no está configurada (URL vacía, credencial faltante, etc.). */
  isConfigured(): boolean;
  /** Eventos recientes normalizados al formato interno. */
  getRecentEarthquakes(): Promise<ProviderResult>;
  /** Consulta un evento específico por id externo (opcional). */
  getEarthquakeById?(externalId: string): Promise<EarthquakeInput | null>;
}

export const EARTHQUAKE_PROVIDER_NAMES = ['sgc', 'usgs', 'mock'] as const;
export type EarthquakeProviderName = (typeof EARTHQUAKE_PROVIDER_NAMES)[number];
