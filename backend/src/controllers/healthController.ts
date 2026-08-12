import { Request, Response } from 'express';
import { databaseHealth } from '../config/db';
import { env } from '../config/env';
import { SourceStatus } from '../models/SourceStatus';
import { pushService } from '../services/pushService';
import { ProviderRegistry } from '../adapters';

function buildRegistry(): ProviderRegistry {
  return new ProviderRegistry({
    sgcUrl: env.sgcApiUrl,
    usgsUrl: env.usgsApiUrl,
    mockEnabled: env.mockEnabled,
    mockIntervalMinutes: env.mockIntervalMinutes,
  });
}

export async function health(_req: Request, res: Response) {
  const db = await databaseHealth();
  const registry = buildRegistry();
  const statuses = await SourceStatus.find().lean();

  const earthquakeSources: Record<string, string> = {};
  for (const name of registry.names()) {
    const provider = registry.get(name)!;
    if (!provider.isConfigured()) {
      earthquakeSources[name] = 'misconfigured';
      continue;
    }
    const st = statuses.find((s) => s.source === name);
    if (st) {
      earthquakeSources[name] = st.status;
      continue;
    }
    const enabled = (await (await import('../services/alertConfigService')).getAlertConfig())
      .sources[name]?.enabled ?? true;
    earthquakeSources[name] = enabled ? 'down' : 'disabled';
  }

  res.json({
    status: db ? 'ok' : 'degraded',
    database: db ? 'connected' : 'disconnected',
    earthquakeSources,
    push: pushService.isConfigured() ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString(),
  });
}

export async function ready(_req: Request, res: Response) {
  const db = await databaseHealth();
  if (!db) {
    return res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
  res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
}
