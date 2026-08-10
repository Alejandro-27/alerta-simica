import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  logoutUser,
} from '../src/services/authService';
import { registerSchema, loginSchema, subscribePushSchema } from '../src/validators/authValidators';
import { User } from '../src/models/User';
import { ApiError } from '../src/utils/errors';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Autenticación', () => {
  it('registra un usuario con contraseña hasheada (nunca texto plano)', async () => {
    const { user } = await registerUser({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@test.co',
      password: 'password123',
    });
    expect(user.email).toBe('ana@test.co');
    const stored = await User.findOne({ email: 'ana@test.co' }).select('+passwordHash');
    expect(stored?.passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', stored!.passwordHash)).toBe(true);
  });

  it('no permite registrar un correo duplicado', async () => {
    await expect(
      registerUser({ firstName: 'A', lastName: 'B', email: 'ana@test.co', password: 'password123' }),
    ).rejects.toThrow(ApiError);
  });

  it('login con credenciales correctas', async () => {
    const { tokens } = await loginUser('ana@test.co', 'password123');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  it('rechaza login con contraseña incorrecta', async () => {
    await expect(loginUser('ana@test.co', 'incorrecta')).rejects.toThrow(ApiError);
  });

  it('refresca el access token con el refresh token', async () => {
    const { tokens } = await loginUser('ana@test.co', 'password123');
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
  });

  it('logout revoca el refresh token (tokenVersion++)', async () => {
    const { user, tokens } = await loginUser('ana@test.co', 'password123');
    await logoutUser(String(user._id));
    await expect(refreshAccessToken(tokens.refreshToken)).rejects.toThrow(ApiError);
  });

  it('flujo completo de recuperación de contraseña', async () => {
    const token = await requestPasswordReset('ana@test.co');
    expect(token.length).toBeGreaterThan(10);
    await resetPassword(token, 'nueva-clave-123');
    await expect(loginUser('ana@test.co', 'password123')).rejects.toThrow();
    const { tokens } = await loginUser('ana@test.co', 'nueva-clave-123');
    expect(tokens.accessToken).toBeTruthy();
  });

  it('rechaza token de reset ya usado', async () => {
    const token = await requestPasswordReset('ana@test.co');
    await resetPassword(token, 'otra-clave-456');
    await expect(resetPassword(token, 'otra-mas-789')).rejects.toThrow(ApiError);
  });
});

describe('Validación Zod', () => {
  it('rechaza contraseñas cortas', () => {
    const r = registerSchema.safeParse({
      firstName: 'A', lastName: 'B', email: 'a@b.co', password: 'corta',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza correos inválidos', () => {
    const r = loginSchema.safeParse({ email: 'no-correo', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('acepta payload válido de suscripción push', () => {
    const r = subscribePushSchema.safeParse({
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'x'.repeat(20), auth: 'y'.repeat(20) },
      },
    });
    expect(r.success).toBe(true);
  });

  it('rechaza suscripción push sin endpoint URL', () => {
    const r = subscribePushSchema.safeParse({
      subscription: { endpoint: 'no-url', keys: { p256dh: 'x'.repeat(20), auth: 'y'.repeat(20) } },
    });
    expect(r.success).toBe(false);
  });
});
