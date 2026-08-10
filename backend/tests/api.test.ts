import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { PushSubscription } from '../src/models/PushSubscriptionDoc';
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
