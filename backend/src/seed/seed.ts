/**
 * Seed opcional de datos de demostración.
 * Uso: npm run seed
 *
 * Crea:
 *  - 1 usuario administrador (admin@alertasimica.local)
 *  - 1 usuario normal (demo@alertasimica.local)
 *  - ~15 terremotos históricos reales de Colombia marcados demo:true
 *
 * Los eventos demo NUNCA generan alertas y siempre se distinguen de los reales.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { User } from '../models/User';
import { Earthquake } from '../models/Earthquake';
import { AlertConfiguration } from '../models/AlertConfiguration';
import { SourceStatus } from '../models/SourceStatus';
import { logger } from '../utils/logger';

if (env.isProd) {
  logger.error('El seed de demostración no debe ejecutarse en producción.');
  process.exit(1);
}

const DEMO_EARTHQUAKES = [
  // [fecha, mag, lat, lon, prof, lugar]
  ['1999-01-25T18:19:00-05:00', 6.2, 4.45, -75.7, 17, 'Armenia, Quindío'],
  ['2013-02-09T09:16:00-05:00', 6.9, 1.13, -77.36, 146, 'Tumaco, Nariño'],
  ['2017-05-31T12:22:00-05:00', 5.7, 3.24, -76.34, 120, 'La Cumbre, Valle del Cauca'],
  ['2018-08-07T10:53:00-05:00', 5.6, 5.9, -73.4, 152, 'Sogamoso, Boyacá'],
  ['2019-03-23T15:21:00-05:00', 6.1, 3.46, -76.62, 113, 'El Dovio, Valle del Cauca'],
  ['2020-01-12T14:30:00-05:00', 5.2, 4.69, -75.65, 105, 'El Dovio, Valle del Cauca'],
  ['2021-05-24T21:04:00-05:00', 6.1, 4.09, -76.44, 83, 'Ansermanuevo, Valle del Cauca'],
  ['2022-08-12T14:17:00-05:00', 5.8, 4.67, -76.48, 62, 'Ansermanuevo, Valle del Cauca'],
  ['2023-03-10T20:18:00-05:00', 5.4, 6.53, -73.1, 156, 'Zapatoca, Santander'],
  ['2023-08-17T12:04:00-05:00', 6.1, 4.36, -73.63, 10, 'El Calvario, Meta'],
  ['2023-08-17T12:17:00-05:00', 5.6, 4.36, -73.62, 10, 'El Calvario, Meta'],
  ['2023-12-22T06:35:00-05:00', 5.4, 7.66, -77.35, 48, 'Acandí, Chocó'],
  ['2024-03-12T14:09:00-05:00', 5.6, 5.17, -72.92, 160, 'Pisba, Boyacá'],
  ['2024-07-04T16:09:00-05:00', 4.5, 4.41, -75.75, 12, 'Salento, Quindío'],
  ['2025-01-08T10:32:00-05:00', 5.3, 3.72, -76.95, 110, 'Dagua, Valle del Cauca'],
];

async function main() {
  await mongoose.connect(env.mongodbUri);
  logger.info('Conectado a MongoDB, sembrando datos de demostración...');

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await User.findOneAndUpdate(
    { email: 'admin@alertasimica.local' },
    {
      $setOnInsert: {
        firstName: 'Admin',
        lastName: 'AlertaSísmica',
        email: 'admin@alertasimica.local',
        passwordHash,
        role: 'ADMIN',
        active: true,
      },
    },
    { upsert: true, new: true },
  );

  const demoHash = await bcrypt.hash('Demo123!', 12);
  const demo = await User.findOneAndUpdate(
    { email: 'demo@alertasimica.local' },
    {
      $setOnInsert: {
        firstName: 'Usuario',
        lastName: 'Demo',
        email: 'demo@alertasimica.local',
        passwordHash: demoHash,
        role: 'USER',
        active: true,
        location: { latitude: 4.711, longitude: -74.072, accuracy: 500, updatedAt: new Date() },
      },
    },
    { upsert: true, new: true },
  );

  let created = 0;
  for (const [date, mag, lat, lon, depth, place] of DEMO_EARTHQUAKES) {
    const eventTime = new Date(date);
    const externalId = `demo-${eventTime.getTime()}`;
    const exists = await Earthquake.findOne({ externalId, source: 'mock' });
    if (exists) continue;
    await Earthquake.create({
      externalId,
      source: 'mock',
      magnitude: mag,
      magnitudeType: 'ML',
      latitude: lat,
      longitude: lon,
      depth,
      place,
      eventTime,
      updatedAt: eventTime,
      tsunami: false,
      felt: null,
      alertLevel: null,
      status: 'reviewed',
      sourceUrl: null,
      rawData: { demo: true, historical: true, seededAt: new Date().toISOString() },
      firstDetectedAt: eventTime,
      lastSeenAt: eventTime,
      demo: true,
    });
    created += 1;
  }

  await AlertConfiguration.updateOne(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true },
  );
  await SourceStatus.updateOne(
    { source: 'mock' },
    { $set: { status: 'disabled' } },
    { upsert: true },
  );

  logger.info({
    adminId: String(admin._id),
    demoUserId: String(demo._id),
    earthquakesCreated: created,
    totalDemoEarthquakes: DEMO_EARTHQUAKES.length,
  }, 'Seed completado');

  logger.info('');
  logger.info('Cuentas de demostración creadas (contraseñas conocidas solo por el operador del seed).');
  logger.info('Los terremotos demo están marcados demo:true y no generan alertas.');

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error({ err }, 'Seed falló');
  process.exit(1);
});
