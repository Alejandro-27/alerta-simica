import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { acquireLock, withLock } from '../src/utils/lock';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Distributed lock (MongoDB)', () => {
  it('solo un ejecutor obtiene el lock', async () => {
    const a = await acquireLock('test-lock', 5000, 'instancia-a');
    const b = await acquireLock('test-lock', 5000, 'instancia-b');
    expect(a).toBeTruthy();
    expect(b).toBeNull();
    await a!.release();
  });

  it('el lock expirado puede reclamarse', async () => {
    const a = await acquireLock('test-expired', 100, 'instancia-a');
    expect(a).toBeTruthy();
    await new Promise((r) => setTimeout(r, 150));
    const b = await acquireLock('test-expired', 5000, 'instancia-b');
    expect(b).toBeTruthy();
    await b!.release();
  });

  it('withLock no ejecuta fn cuando otra instancia posee el lock', async () => {
    const first = await acquireLock('test-withlock', 5000, 'owner');
    expect(first).toBeTruthy();
    let runs = 0;
    const { executed } = await withLock('test-withlock', 5000, 'otra', async () => {
      runs += 1;
    });
    expect(executed).toBe(false);
    expect(runs).toBe(0);
    await first!.release();
  });

  it('withLock ejecuta y devuelve el resultado con el lock libre', async () => {
    const { executed, result } = await withLock('test-free', 5000, 'owner', async () => 42);
    expect(executed).toBe(true);
    expect(result).toBe(42);
  });
});
