import { AlertConfiguration } from '../models/AlertConfiguration';
import { getAlertConfig } from './alertConfigService';
import { SourceStatus } from '../models/SourceStatus';
import { env } from '../config/env';
import { ProviderRegistry } from '../adapters';

/** Crea/actualiza la configuración global y los estados de fuente al arrancar. */
export async function initSystemConfig(): Promise<void> {
  const config = await getAlertConfig(true);
  const registry = new ProviderRegistry({
    sgcUrl: env.sgcApiUrl,
    usgsUrl: env.usgsApiUrl,
    mockEnabled: env.mockEnabled,
    mockIntervalMinutes: env.mockIntervalMinutes,
  });

  const enabledSources: string[] = [];
  for (const name of registry.names()) {
    enabledSources.push(name);
  }
  if (Object.keys(config.sources ?? {}).length === 0) {
    config.sources = Object.fromEntries(enabledSources.map((s) => [s, { enabled: true }]));
    await AlertConfiguration.updateOne(
      { key: 'global' },
      { $set: { sources: config.sources } },
    );
  }

  for (const name of enabledSources) {
    const provider = registry.get(name)!;
    await SourceStatus.updateOne(
      { source: name },
      {
        $setOnInsert: {
          status: provider.isConfigured() ? 'down' : 'misconfigured',
          consecutiveFailures: 0,
          eventsFound: 0,
        },
      },
      { upsert: true },
    );
  }
}
