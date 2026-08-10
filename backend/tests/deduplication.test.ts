import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { Earthquake } from '../src/models/Earthquake';
import { upsertEarthquake } from '../src/services/earthquakeService';
import { findAffectedUsers } from '../src/services/userService';

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
  await User.deleteMany({});
  await Earthquake.deleteMany({});
});

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    externalId: 'us7000x',
    source: 'usgs',
    magnitude: 5.0,
    magnitudeType: 'mb',
    latitude: 4.6,
    longitude: -74.0,
    depth: 40,
    place: 'Colombia',
    eventTime: new Date(),
    updatedAt: new Date(),
    tsunami: false,
    felt: null,
    alertLevel: null,
    status: 'automatic',
    sourceUrl: null,
    rawData: { test: true },
    ...overrides,
  } as Parameters<typeof upsertEarthquake>[0];
}

async function createUser(location: { latitude: number; longitude: number } | null, settings: Record<string, unknown> = {}) {
  const doc = {
    firstName: 'Test',
    lastName: 'User',
    email: `u${Date.now()}-${Math.random()}@test.co`,
    passwordHash: 'x',
    active: true,
    location: location ? { ...location, accuracy: 100, updatedAt: new Date() } : null,
    alertSettings: { enabled: true, nearbyAlerts: true, nationalAlerts: true, minimumMagnitude: 4.5, alertRadiusKm: 150, ...settings },
  };
  return User.create(doc);
}

describe('Deduplicación de terremotos', () => {
  it('crea el evento la primera vez', async () => {
    const r = await upsertEarthquake(makeEvent());
    expect(r.created).toBe(true);
    expect(r.changed).toBe(true);
  });

  it('no duplica con el mismo externalId+source', async () => {
    const event = makeEvent();
    await upsertEarthquake(event);
    const r = await upsertEarthquake(event);
    expect(r.created).toBe(false);
    expect(r.updated).toBe(false);
    expect(r.changed).toBe(false);
    expect(await Earthquake.countDocuments()).toBe(1);
  });

  it('la misma externalId en otra fuente es un evento distinto', async () => {
    await upsertEarthquake(makeEvent({ source: 'usgs' }));
    await upsertEarthquake(makeEvent({ source: 'sgc' }));
    expect(await Earthquake.countDocuments()).toBe(2);
  });

  it('actualiza el evento cuando la magnitud cambia', async () => {
    await upsertEarthquake(makeEvent({ magnitude: 5.0 }));
    const r = await upsertEarthquake(makeEvent({ magnitude: 5.4 }));
    expect(r.updated).toBe(true);
    const doc = await Earthquake.findOne({ externalId: 'us7000x' });
    expect(doc?.magnitude).toBe(5.4);
  });

  it('marca demo los eventos de la fuente mock', async () => {
    const r = await upsertEarthquake(makeEvent({ source: 'mock', externalId: 'mock-1' }));
    expect(r.doc.demo).toBe(true);
  });
});

describe('Cálculo de usuarios afectados', () => {
  const CONFIG = { minimumMagnitude: 4.5, maximumDepth: 200, alertRadiusKm: 150 };

  it('incluye usuarios con ubicación dentro del radio', async () => {
    // Epicentro en Bogotá; usuario a ~50 km.
    await createUser({ latitude: 4.2, longitude: -74.4 });
    const affected = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 5.0, depth: 40 },
      CONFIG,
    );
    expect(affected.length).toBe(1);
    expect(affected[0].distanceKm).toBeLessThan(100);
  });

  it('excluye usuarios lejos del radio sin alertas nacionales', async () => {
    await createUser({ latitude: 10.96, longitude: -74.8 }, { nationalAlerts: false }); // Barranquilla ~800 km
    const affected = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 5.0, depth: 40 },
      CONFIG,
    );
    expect(affected.length).toBe(0);
  });

  it('incluye usuarios lejos del radio con alertas nacionales (informativa)', async () => {
    await createUser({ latitude: 10.96, longitude: -74.8 }, { nationalAlerts: true });
    const affected = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 5.0, depth: 40 },
      CONFIG,
    );
    expect(affected.length).toBe(1);
    expect(affected[0].distanceKm).toBeGreaterThan(700);
  });

  it('incluye usuarios sin ubicación solo si tienen alertas nacionales', async () => {
    await createUser(null);
    await createUser(null, { nationalAlerts: false });
    const affected = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 5.0, depth: 40 },
      CONFIG,
    );
    expect(affected.length).toBe(1);
    expect(affected[0].distanceKm).toBeNull();
  });

  it('respeta el umbral personal de magnitud', async () => {
    await createUser(null, { minimumMagnitude: 6.0 });
    const affected = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 5.0, depth: 40 },
      CONFIG,
    );
    expect(affected.length).toBe(0);
  });

  it('no alerta si el evento no pasa el umbral global', async () => {
    await createUser({ latitude: 4.6, longitude: -74.0 });
    const low = await findAffectedUsers(
      { latitude: 4.6, longitude: -74.0, magnitude: 3.0, depth: 40 },
      CONFIG,
    );
    expect(low.length).toBe(0);
  });
});
