import mongoose from 'mongoose';

/**
 * Distributed lock sobre MongoDB.
 * Permite que, si se despliegan varias instancias del backend,
 * el job de polling NO se ejecute en duplicado.
 */

export interface DistributedLock {
  /** Intenta renovar el lock. Devuelve true si aún lo posee. */
  tryAcquire(): Promise<boolean>;
  /** Libera el lock si aún lo posee. */
  release(): Promise<void>;
}

function buildLock(name: string, ownerId: string): DistributedLock {
  const col = () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Base de datos no conectada');
    return db.collection('distributed_locks');
  };
  return {
    async tryAcquire() {
      const renewed = await col().findOneAndUpdate(
        { name, ownerId, expiresAt: { $gt: new Date() } },
        { $set: { expiresAt: new Date(Date.now() + 60000) } },
      );
      return Boolean(renewed);
    },
    async release() {
      await col().deleteOne({ name, ownerId });
    },
  };
}

export async function acquireLock(
  name: string,
  ttlMs: number,
  ownerId: string,
): Promise<DistributedLock | null> {
  const db = mongoose.connection.db;
  if (!db) return null;
  const col = db.collection('distributed_locks');
  // Asegura la unicidad del lock (idempotente).
  await col.createIndex({ name: 1 }, { unique: true }).catch(() => undefined);
  const now = new Date();

  // Renovar si ya somos dueños.
  const owned = await col.findOneAndUpdate(
    { name, ownerId, expiresAt: { $gt: now } },
    { $set: { expiresAt: new Date(now.getTime() + ttlMs) } },
  );
  if (owned) return buildLock(name, ownerId);

  // Reclamar un lock expirado (actualización atómica).
  const stolen = await col.findOneAndUpdate(
    { name, expiresAt: { $lte: now } },
    { $set: { ownerId, acquiredAt: now, expiresAt: new Date(now.getTime() + ttlMs) } },
  );
  if (stolen) return buildLock(name, ownerId);

  // Insertar el lock (E11000 = ya existe uno vigente).
  try {
    await col.insertOne({ name, ownerId, acquiredAt: now, expiresAt: new Date(now.getTime() + ttlMs) });
    return buildLock(name, ownerId);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return null;
    throw err;
  }
}

/** Conveniencia: ejecuta fn bajo un lock distribuido con try/finally. */
export async function withLock<T>(
  name: string,
  ttlMs: number,
  ownerId: string,
  fn: () => Promise<T>,
): Promise<{ executed: boolean; result?: T }> {
  const lock = await acquireLock(name, ttlMs, ownerId);
  if (!lock) return { executed: false };
  try {
    const result = await fn();
    return { executed: true, result };
  } finally {
    await lock.release();
  }
}
