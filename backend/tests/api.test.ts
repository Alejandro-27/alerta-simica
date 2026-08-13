import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Earthquake } from '../src/models/Earthquake';
import { PushSubscription } from '../src/models/PushSubscriptionDoc';
import { calculateDistanceKm } from '@shared';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await PushSubscription.deleteMany({});
});

async function createUserAndLogin() {
  const hash = await bcrypt.hash('password123', 10);
  const user = await User.create({
    firstName: 'T',
    lastName: 'U',
    email: 'push@test.co',
    passwordHash: hash,
    role: 'USER',
    active: true,
  });
  const res = await request(app).post('/api/auth/login').send({ email: 'push@test.co', password: 'password123' });
  return { user, token: res.body.tokens.accessToken };
}

describe('API de suscripción push', () => {
  it('GET /api/push/public-key devuelve la llave pública (sin la privada)', async () => {
    const res = await request(app).get('/api/push/public-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('publicKey');
    expect(res.body).toHaveProperty('configured');
    expect(res.body.publicKey).not.toContain('PRIVATE');
  });

  it('requiere autenticación para suscribirse', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .send({ subscription: { endpoint: 'https://x.dev/y', keys: { p256dh: 'a'.repeat(30), auth: 'b'.repeat(30) } } });
    expect(res.status).toBe(401);
  });

  it('registra una suscripción y la persiste', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subscription: { endpoint: 'https://push.example.com/ep1', keys: { p256dh: 'p'.repeat(30), auth: 'a'.repeat(30) } },
        browser: 'Chrome',
        platform: 'Android',
      });
    expect(res.status).toBe(201);
    expect(res.body.subscription.active).toBe(true);
    const stored = await PushSubscription.findOne({ endpoint: 'https://push.example.com/ep1' });
    expect(stored).toBeTruthy();
    expect(stored?.browser).toBe('Chrome');
  });

  it('no guarda la llave privada VAPID en ningún lado', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subscription: { endpoint: 'https://push.example.com/ep2', keys: { p256dh: 'p'.repeat(30), auth: 'a'.repeat(30) } },
      });
    expect(res.status).toBe(201);
    const doc = await PushSubscription.findOne({ endpoint: 'https://push.example.com/ep2' }).lean();
    const json = JSON.stringify(doc);
    expect(json).not.toContain('VAPID');
    expect(json).not.toContain('privateKey');
  });

  it('desuscribe eliminando la suscripción', async () => {
    const { token } = await createUserAndLogin();
    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: { endpoint: 'https://push.example.com/ep3', keys: { p256dh: 'p'.repeat(30), auth: 'a'.repeat(30) } } });
    const res = await request(app)
      .delete('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: 'https://push.example.com/ep3' });
    expect(res.status).toBe(204);
    expect(await PushSubscription.countDocuments({ endpoint: 'https://push.example.com/ep3' })).toBe(0);
  });
});

beforeEach(async () => {
  await User.deleteMany({});
  await PushSubscription.deleteMany({});
  await Earthquake.deleteMany({});
});

async function seedEarthquakes() {
  const base = {
    magnitudeType: 'ml',
    tsunami: false,
    felt: null,
    alertLevel: null,
    status: 'automatic',
    sourceUrl: null,
    rawData: null,
    firstDetectedAt: new Date(),
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  };
  await Earthquake.create([
    { ...base, externalId: 'co-1', source: 'sgc', magnitude: 5.2, latitude: 4.6, longitude: -74.1, depth: 12, place: 'Bogotá D.C.', eventTime: new Date('2026-08-10T10:00:00Z') },
    { ...base, externalId: 'co-2', source: 'usgs', magnitude: 4.0, latitude: 6.2, longitude: -75.6, depth: 80, place: 'Andes, Colombia', eventTime: new Date('2026-08-10T11:00:00Z') },
    { ...base, externalId: 'us-1', source: 'usgs', magnitude: 6.0, latitude: 60.0, longitude: -153.0, depth: 50, place: 'Alaska', eventTime: new Date('2026-08-10T12:00:00Z') },
    { ...base, externalId: 'mock-1', source: 'mock', demo: true, magnitude: 5.0, latitude: 3.4, longitude: -76.5, depth: 20, place: 'Cali, Valle del Cauca', eventTime: new Date('2026-08-10T13:00:00Z') },
  ]);
}

describe('Filtros de listado de sismos', () => {
  it('scope=co (default) solo incluye eventos dentro del bbox de Colombia', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?pageSize=50');
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toContain('co-1');
    expect(ids).toContain('co-2');
    expect(ids).not.toContain('us-1');
    expect(ids).not.toContain('mock-1');
  });

  it('scope=world incluye todos los eventos reales, no demo', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?scope=world&pageSize=50');
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toContain('us-1');
    expect(ids).not.toContain('mock-1');
  });

  it('scope=world + source=mock incluye eventos demo', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?scope=world&source=mock&pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { externalId: string }) => i.externalId)).toContain('mock-1');
  });

  it('scope=co + department filtra por caja geográfica del departamento', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?scope=co&department=Bogot&pageSize=50');
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toContain('co-1');
    expect(ids).not.toContain('co-2');
    expect(ids).not.toContain('us-1');
  });

  it('department funciona aunque el texto del lugar no mencione el departamento', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?scope=co&department=Antioquia&pageSize=50');
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toContain('co-2');
    expect(ids).not.toContain('co-1');
  });

  it('fechas y magnitud siguen funcionando en scope co', async () => {
    await seedEarthquakes();
    const res = await request(app).get(
      '/api/earthquakes?scope=co&from=2026-08-10T08:00:00.000Z&to=2026-08-10T12:59:59.000Z&minMagnitude=4.5&pageSize=50',
    );
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toEqual(['co-1']);
  });

  it('consulta con rango histórico funciona sin romper (backfill omitido en test)', async () => {
    await seedEarthquakes();
    const res = await request(app).get(
      '/api/earthquakes?scope=co&from=2026-08-01T00:00:00.000Z&to=2026-08-10T23:59:59.000Z&pageSize=50',
    );
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { externalId: string }) => i.externalId);
    expect(ids).toContain('co-1');
    expect(ids).toContain('co-2');
  });
});

describe('Distancia a la ubicación del usuario', () => {
  async function seedUserWithManualLocation() {
    const hash = await bcrypt.hash('password123', 10);
    const user = await User.create({
      firstName: 'U',
      lastName: 'R',
      email: 'dist@test.co',
      passwordHash: hash,
      role: 'USER',
      active: true,
      locationManual: {
        country: 'Colombia',
        department: 'Cundinamarca',
        municipality: 'Bogotá',
        latitude: 4.711,
        longitude: -74.072,
      },
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'dist@test.co', password: 'password123' });
    return { user, token: res.body.tokens.accessToken };
  }

  it('sin sesión: distanceKm es null', async () => {
    await seedEarthquakes();
    const res = await request(app).get('/api/earthquakes?pageSize=50');
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.distanceKm).toBeNull();
    }
  });

  it('con ubicación manual guardada, distanceKm se calcula en la lista', async () => {
    await seedEarthquakes();
    const { token } = await seedUserWithManualLocation();
    const res = await request(app)
      .get('/api/earthquakes?pageSize=50')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const co1 = res.body.items.find((i: { externalId: string }) => i.externalId === 'co-1');
    expect(co1).toBeTruthy();
    expect(co1.distanceKm).toBeGreaterThan(0);
  });

  it('ubicación manual sin coordenadas (legacy): distanceKm se resuelve al vuelo', async () => {
    await seedEarthquakes();
    const hash = await bcrypt.hash('password123', 10);
    await User.create({
      firstName: 'L',
      lastName: 'G',
      email: 'legacy@test.co',
      passwordHash: hash,
      role: 'USER',
      active: true,
      locationManual: {
        country: 'Colombia',
        department: 'Cundinamarca',
        municipality: 'Bogotá',
      },
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'legacy@test.co', password: 'password123' });
    const token = res.body.tokens.accessToken;
    const list = await request(app)
      .get('/api/earthquakes?pageSize=50')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const co1 = list.body.items.find((i: { externalId: string }) => i.externalId === 'co-1');
    expect(co1).toBeTruthy();
    expect(co1.distanceKm).toBe(calculateDistanceKm(4.6, -74.1, 4.711, -74.072));
  });

  it('el GPS (location) tiene prioridad sobre la ubicación manual', async () => {
    await seedEarthquakes();
    const { user, token } = await seedUserWithManualLocation();
    user.location = { latitude: 6.244, longitude: -75.573, accuracy: 10, updatedAt: new Date() };
    await user.save();
    const res = await request(app)
      .get('/api/earthquakes?pageSize=50')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const co1 = res.body.items.find((i: { externalId: string }) => i.externalId === 'co-1');
    const gpsKm = Math.round((co1 as { distanceKm: number }).distanceKm);
    const manualKm = Math.round(
      // 4.711,-74.072 → epicentro co-1 (4.6,-74.1)
      calculateDistanceKm(4.6, -74.1, 4.711, -74.072),
    );
    expect(gpsKm).not.toBe(manualKm);
    expect(gpsKm).toBe(Math.round(calculateDistanceKm(4.6, -74.1, 6.244, -75.573)));
  });

  it('GET /earthquakes/:id incluye distanceKm con sesión', async () => {
    await seedEarthquakes();
    const { token } = await seedUserWithManualLocation();
    const list = await request(app).get('/api/earthquakes?pageSize=50');
    const id = list.body.items.find((i: { externalId: string }) => i.externalId === 'co-1').id;
    const res = await request(app).get(`/api/earthquakes/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.earthquake.distanceKm).toBeGreaterThan(0);
  });
});

describe('Manejo de errores y seguridad', () => {
  it('errores de validación devuelven 400 con detalle', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'no-es-correo', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeTruthy();
  });

  it('nunca devuelve passwordHash en el perfil', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('$2a$');
    expect(json).not.toContain('$2b$');
  });

  it('ruta inexistente devuelve 404 JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('access sin token en /api/user/profile => 401', async () => {
    const res = await request(app).get('/api/user/profile');
    expect(res.status).toBe(401);
  });

  it('admin bloqueado para usuarios normales', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
