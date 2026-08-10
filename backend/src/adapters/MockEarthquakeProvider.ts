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
    const lat = 4.5 + (this.seq % 5) * 0.8;
    const lon = -74 + (this.seq % 3) * 1.2;
    return {
      externalId: `mock-${base}`,
      source: this.name,
      magnitude: 3.5 + ((this.seq * 7) % 30) / 10,
      magnitudeType: 'ML',
      latitude: lat,
      longitude: lon,
      depth: 10 + ((this.seq * 13) % 120),
      place: 'Evento simulado de prueba (DEMO)',
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
