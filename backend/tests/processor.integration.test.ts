import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Earthquake } from '../src/models/Earthquake';
import { User } from '../src/models/User';
import { Notification } from '../src/models/Notification';
import { AlertConfiguration } from '../src/models/AlertConfiguration';
import { EarthquakeProcessor } from '../src/services/earthquakeProcessor';
import { ProviderRegistry } from '../src/adapters';
import type { EarthquakeProvider } from '../src/adapters/types';
import type { EarthquakeInput } from '../../shared/src';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Earthquake.deleteMany({});
  await User.deleteMany({});
  await Notification.deleteMany({});
  await AlertConfiguration.deleteMany({});
});

function fakeProvider(name: string, events: EarthquakeInput[]): EarthquakeProvider {
  return {
    name,
    label: `Fake ${name}`,
    isConfigured: () => true,
    getRecentEarthquakes: async () => ({ events, queriedUrl: 'fake://' }),
  };
}

function makeEvent(overrides: Partial<EarthquakeInput> = {}): EarthquakeInput {
  return {
    externalId: `e-${Math.random()}`,
    source: 'fake',
    magnitude: 5.2,
    magnitudeType: 'mb',
    latitude: 4.6,
    longitude: -74.0,
    depth: 40,
    place: 'Cerca de Bogotá',
    eventTime: new Date(),
    updatedAt: new Date(),
    tsunami: false,
    felt: null,
    alertLevel: null,
    status: 'automatic',
    sourceUrl: null,
    rawData: {},
    ...overrides,
  };
}

async function seedConfig() {
  return AlertConfiguration.create({
    key: 'global',
    minimumMagnitude: 4.5,
    maximumDepth: 200,
    alertRadiusKm: 150,
    highMagnitudeThreshold: 5.5,
    enabled: true,
    country: 'Colombia',
    sources: { fake: { enabled: true } },
    pollIntervalSeconds: 30,
  });
}

describe('EarthquakeProcessor (integración)', () => {
  it('procesa eventos nuevos y genera alertas para usuarios afectados', async () => {
    await seedConfig();
    await User.create({
      firstName: 'Cerca',
      lastName: 'Del Epicentro',
      email: 'cerca@test.co',
      passwordHash: 'x',
      active: true,
      location: { latitude: 4.4, longitude: -73.8, accuracy: 100, updatedAt: new Date() },
      alertSettings: { enabled: true, nearbyAlerts: true, nationalAlerts: true, minimumMagnitude: 4.5, alertRadiusKm: 150 },
    });

    const provider = fakeProvider('fake', [makeEvent()]);
    const registry = { get: (n: string) => (n === 'fake' ? provider : null), available: () => [provider], names: () => ['fake'] } as unknown as ProviderRegistry;

    const processor = new EarthquakeProcessor(registry);
    const stats = await processor.process({ sources: ['fake'] });

    expect(stats.newEvents).toBe(1);
    expect(await Earthquake.countDocuments()).toBe(1);
    // El usuario está dentro del radio => alerta creada (push no configurado en test: error, pero registro existe).
    const notif = await Notification.findOne();
    expect(notif).toBeTruthy();
    expect(notif?.type).toBe('EARTHQUAKE_ALERT');
    expect(notif?.delivered).toBe(false);
  });

  it('no duplica alertas en un segundo ciclo', async () => {
    await seedConfig();
    await User.create({
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      passwordHash: 'x',
      active: true,
      location: { latitude: 4.4, longitude: -73.8, accuracy: 100, updatedAt: new Date() },
      alertSettings: { enabled: true, nearbyAlerts: true, nationalAlerts: true, minimumMagnitude: 4.5, alertRadiusKm: 150 },
    });
    const event = makeEvent({ externalId: 'dedupe-1' });
    const provider = fakeProvider('fake', [event]);
    const registry = { get: (n: string) => (n === 'fake' ? provider : null), available: () => [provider], names: () => ['fake'] } as unknown as ProviderRegistry;

    const processor = new EarthquakeProcessor(registry);
    await processor.process({ sources: ['fake'] });
    await processor.process({ sources: ['fake'] });

    expect(await Earthquake.countDocuments()).toBe(1);
    expect(await Notification.countDocuments()).toBe(1);
  });

  it('una fuente caída no detiene a las demás (tolerancia a fallos)', async () => {
    await seedConfig();
    const broken = fakeProvider('broken', []);
    broken.getRecentEarthquakes = async () => {
      throw new Error('Fuente caída');
    };
    const ok = fakeProvider('ok', [makeEvent({ source: 'ok' })]);
    const registry = {
      get: (n: string) => (n === 'broken' ? broken : n === 'ok' ? ok : null),
      available: () => [broken, ok],
      names: () => ['broken', 'ok'],
    } as unknown as ProviderRegistry;

    const processor = new EarthquakeProcessor(registry);
    const stats = await processor.process({ sources: ['broken', 'ok'] });

    expect(stats.errors.some((e) => e.source === 'broken')).toBe(true);
    expect(stats.newEvents).toBe(1);
    expect(await Earthquake.countDocuments()).toBe(1);
  });

  it('eventos demo (mock) nunca generan alertas', async () => {
    await seedConfig();
    await User.create({
      firstName: 'U',
      lastName: 'Demo',
      email: 'demo@test.co',
      passwordHash: 'x',
      active: true,
      location: { latitude: 4.6, longitude: -74.0, accuracy: 100, updatedAt: new Date() },
      alertSettings: { enabled: true, nearbyAlerts: true, nationalAlerts: true, minimumMagnitude: 4.5, alertRadiusKm: 150 },
    });
    const provider = fakeProvider('mock', [makeEvent({ source: 'mock' })]);
    const registry = { get: (n: string) => (n === 'mock' ? provider : null), available: () => [provider], names: () => ['mock'] } as unknown as ProviderRegistry;

    const processor = new EarthquakeProcessor(registry);
    const stats = await processor.process({ sources: ['mock'] });
    expect(stats.newEvents).toBe(1);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('eventos por debajo del umbral no generan alertas', async () => {
    await seedConfig();
    await User.create({
      firstName: 'U',
      lastName: 'U',
      email: 'u@test.co',
      passwordHash: 'x',
      active: true,
      location: { latitude: 4.6, longitude: -74.0, accuracy: 100, updatedAt: new Date() },
      alertSettings: { enabled: true, nearbyAlerts: true, nationalAlerts: true, minimumMagnitude: 4.5, alertRadiusKm: 150 },
    });
    const provider = fakeProvider('fake', [makeEvent({ magnitude: 3.1 })]);
    const registry = { get: (n: string) => (n === 'fake' ? provider : null), available: () => [provider], names: () => ['fake'] } as unknown as ProviderRegistry;

    const processor = new EarthquakeProcessor(registry);
    const stats = await processor.process({ sources: ['fake'] });
    expect(stats.alertsSent).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });
});
