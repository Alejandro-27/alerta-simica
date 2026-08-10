import { z } from 'zod';
import type { EarthquakeInput } from '../../../shared/src';
import type { EarthquakeProvider } from './types';
import { SGCEarthquakeProvider } from './SGCEarthquakeProvider';
import { USGSEarthquakeProvider } from './USGSEarthquakeProvider';
import { MockEarthquakeProvider } from './MockEarthquakeProvider';

/** Validación del formato interno de un evento sísmico. */
export const earthquakeInputSchema = z.object({
  externalId: z.string().min(1),
  source: z.string().min(1),
  magnitude: z.number().min(-2).max(12),
  magnitudeType: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  depth: z.number().min(0).max(1000),
  place: z.string().min(1).max(300),
  eventTime: z.date(),
  updatedAt: z.date(),
  tsunami: z.boolean(),
  felt: z.number().nullable(),
  alertLevel: z.string().nullable(),
  status: z.enum(['automatic', 'reviewed', 'deleted', 'preliminary', 'unprocessed']),
  sourceUrl: z.string().nullable(),
  rawData: z.unknown(),
});

export function normalizeEvent(raw: unknown): EarthquakeInput {
  const parsed = earthquakeInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Evento inválido: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  return parsed.data as EarthquakeInput;
}

export function isValidEvent(raw: unknown): raw is EarthquakeInput {
  return earthquakeInputSchema.safeParse(raw).success;
}

export interface ProviderRegistryOptions {
  sgcUrl: string;
  usgsUrl: string;
  mockEnabled: boolean;
  mockIntervalMinutes: number;
}

export class ProviderRegistry {
  private readonly providers: Record<string, EarthquakeProvider>;

  constructor(opts: ProviderRegistryOptions) {
    this.providers = {
      sgc: new SGCEarthquakeProvider(opts.sgcUrl),
      usgs: new USGSEarthquakeProvider(opts.usgsUrl),
      mock: new MockEarthquakeProvider(opts.mockIntervalMinutes),
    };
    if (!opts.mockEnabled) {
      delete this.providers.mock;
    }
  }

  get(name: string): EarthquakeProvider | null {
    return this.providers[name] ?? null;
  }

  available(): EarthquakeProvider[] {
    return Object.values(this.providers);
  }

  names(): string[] {
    return Object.keys(this.providers);
  }
}
