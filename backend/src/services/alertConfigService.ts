import { AlertConfiguration } from '../models/AlertConfiguration';
import { env } from '../config/env';
import type { AlertConfigurationPublic } from '../../../shared/src';

export interface AlertConfigurationDoc {
  key: string;
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

let cache: AlertConfigurationDoc | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 15_000;

/** Carga la configuración global (singleton) con cache corto. */
export async function getAlertConfig(force = false): Promise<AlertConfigurationDoc> {
  const now = Date.now();
  if (!force && cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }
  let doc = await AlertConfiguration.findOne({ key: 'global' });
  if (!doc) {
    doc = await AlertConfiguration.create({
      key: 'global',
      minimumMagnitude: env.earthquakeMinMagnitude,
      maximumDepth: env.earthquakeMaxDepthKm,
      alertRadiusKm: env.earthquakeAlertRadiusKm,
      highMagnitudeThreshold: env.earthquakeHighMagnitudeThreshold,
      enabled: true,
      country: 'Colombia',
      regions: [],
      cities: [],
      sources: Object.fromEntries(
        env.enabledSources.map((s) => [s, { enabled: true }]),
      ),
      pollIntervalSeconds: env.pollIntervalSeconds,
    });
  }
  const plain = doc.toObject() as unknown as AlertConfigurationDoc;
  cache = plain;
  cacheAt = now;
  return plain;
}

export async function updateAlertConfig(
  patch: Partial<Omit<AlertConfigurationDoc, 'key' | 'updatedAt'>>,
): Promise<AlertConfigurationDoc> {
  const current = await getAlertConfig(true);
  const doc = await AlertConfiguration.findOneAndUpdate(
    { key: 'global' },
    { $set: patch },
    { new: true },
  );
  if (!doc) throw new Error('Configuración global no encontrada');
  cache = doc.toObject() as unknown as AlertConfigurationDoc;
  cacheAt = Date.now();
  void current;
  return cache;
}

export function toPublicConfig(c: AlertConfigurationDoc): AlertConfigurationPublic {
  return {
    minimumMagnitude: c.minimumMagnitude,
    maximumDepth: c.maximumDepth,
    alertRadiusKm: c.alertRadiusKm,
    highMagnitudeThreshold: c.highMagnitudeThreshold,
    enabled: c.enabled,
    country: c.country,
    regions: c.regions,
    cities: c.cities,
    sources: c.sources ?? {},
    pollIntervalSeconds: c.pollIntervalSeconds,
    updatedAt: c.updatedAt,
  };
}
