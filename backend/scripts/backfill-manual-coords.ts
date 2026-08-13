/**
 * Backfill idempotente: resuelve coordenadas para ubicaciones manuales
 * guardadas antes del feature de coordenadas (solo departamento/municipio).
 * Uso: pnpm tsx scripts/backfill-manual-coords.ts
 */
import mongoose from 'mongoose';
import { resolveColombiaLocation } from '../../shared/src';
import { env } from '../src/config/env';

async function main() {
  if (!env.mongodbUri) {
    console.error('MONGODB_URI no configurada');
    process.exit(1);
  }
  await mongoose.connect(env.mongodbUri);
  const col = mongoose.connection.db!.collection('users');

  const cursor = col.find({
    'locationManual.department': { $ne: null },
    $or: [
      { 'locationManual.latitude': null },
      { 'locationManual.latitude': { $exists: false } },
    ],
  });

  let updated = 0;
  for await (const user of cursor) {
    const manual = user.locationManual as { department?: string; municipality?: string } | undefined;
    if (!manual?.department) continue;
    const coords = resolveColombiaLocation(manual.department, manual.municipality ?? '');
    if (!coords) continue;
    await col.updateOne(
      { _id: user._id },
      { $set: { 'locationManual.latitude': coords.latitude, 'locationManual.longitude': coords.longitude } },
    );
    updated += 1;
    console.log(`actualizado: ${(user.email as string) ?? String(user._id)} -> ${coords.latitude}, ${coords.longitude}`);
  }

  console.log(`Backfill completado: ${updated} usuario(s) actualizado(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
