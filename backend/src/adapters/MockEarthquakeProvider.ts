import type { EarthquakeInput } from '../../../shared/src';
import type { ProviderResult, EarthquakeProvider } from './types';

/**
 * Proveedor de demostración: genera eventos simulados.
 * Se usa SOLO con EARTHQUAKE_MOCK_ENABLED=true y queda marcado demo: true
 * para diferenciarse siempre de datos reales.
 */
export class MockEarthquakeProvider implements EarthquakeProvider {
  readonly name = 'mock';
  readonly label = 'Fuente simulada (DEMO)';
  private readonly intervalMinutes: number;
  private lastEmittedAt = 0;
  private seq = 0;

  constructor(intervalMinutes = 15) {
    this.intervalMinutes = intervalMinutes;
  }

  isConfigured(): boolean {
    return true;
  }

  async getRecentEarthquakes(): Promise<ProviderResult> {
    const now = Date.now();
    const events: EarthquakeInput[] = [];
    if (now - this.lastEmittedAt >= this.intervalMinutes * 60_000) {
      this.lastEmittedAt = now;
      events.push(this.makeMockEvent(now));
    }
    return { events, queriedUrl: 'mock://generator' };
  }

  private makeMockEvent(now: number): EarthquakeInput {
    this.seq += 1;
    const base = now - this.seq * 37_000;
    const spot = MOCK_SPOTS[(this.seq - 1) % MOCK_SPOTS.length];
    return {
      externalId: `mock-${base}`,
      source: this.name,
      magnitude: 3.5 + ((this.seq * 7) % 30) / 10,
      magnitudeType: 'ML',
      latitude: spot.latitude,
      longitude: spot.longitude,
      depth: 10 + ((this.seq * 13) % 120),
      place: `${spot.municipality}, ${spot.department}`,
      eventTime: new Date(base),
      updatedAt: new Date(now),
      tsunami: false,
      felt: null,
      alertLevel: null,
      status: 'automatic',
      sourceUrl: null,
      rawData: { demo: true, generatedAt: new Date().toISOString() },
    } satisfies EarthquakeInput;
  }
}

/** Puntos representativos de Colombia (municipio + departamento) para la fuente demo. */
const MOCK_SPOTS: Array<{ municipality: string; department: string; latitude: number; longitude: number }> = [
  { municipality: 'Los Santos', department: 'Santander', latitude: 6.71, longitude: -73.11 },
  { municipality: 'Bogotá', department: 'Cundinamarca', latitude: 4.71, longitude: -74.07 },
  { municipality: 'Calarcá', department: 'Quindío', latitude: 4.53, longitude: -75.64 },
  { municipality: 'Pasto', department: 'Nariño', latitude: 1.21, longitude: -77.28 },
  { municipality: 'Cali', department: 'Valle del Cauca', latitude: 3.45, longitude: -76.53 },
  { municipality: 'Cúcuta', department: 'Norte de Santander', latitude: 7.89, longitude: -72.5 },
  { municipality: 'Medellín', department: 'Antioquia', latitude: 6.24, longitude: -75.58 },
  { municipality: 'Ibagué', department: 'Tolima', latitude: 4.44, longitude: -75.24 },
  { municipality: 'Barranquilla', department: 'Atlántico', latitude: 10.97, longitude: -74.8 },
  { municipality: 'Villavicencio', department: 'Meta', latitude: 4.14, longitude: -73.63 },
  { municipality: 'Popayán', department: 'Cauca', latitude: 2.44, longitude: -76.61 },
  { municipality: 'El Cocuy', department: 'Boyacá', latitude: 6.41, longitude: -72.44 },
];
