import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd,
  isTest,
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  mongodbUri: required('MONGODB_URI', isTest ? 'mongodb://localhost:27017/alertasimica_test' : ''),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', isProd ? '' : 'dev-access-secret'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', isProd ? '' : 'dev-refresh-secret'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@alertasimica.local',
  sgcApiUrl: process.env.SGC_API_URL ?? '',
  usgsApiUrl:
    process.env.USGS_API_URL ??
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  earthquakeMinMagnitude: parseFloat(process.env.EARTHQUAKE_MIN_MAGNITUDE ?? '4.5'),
  earthquakeMaxDepthKm: parseFloat(process.env.EARTHQUAKE_MAX_DEPTH_KM ?? '200'),
  earthquakeAlertRadiusKm: parseFloat(process.env.EARTHQUAKE_ALERT_RADIUS_KM ?? '100'),
  earthquakeHighMagnitudeThreshold: parseFloat(
    process.env.EARTHQUAKE_HIGH_MAGNITUDE_THRESHOLD ?? '5.5',
  ),
  pollIntervalSeconds: parseInt(process.env.EARTHQUAKE_POLL_INTERVAL_SECONDS ?? '30', 10),
  pollEnabled: (process.env.EARTHQUAKE_POLL_ENABLED ?? 'true') === 'true',
  enabledSources: (process.env.EARTHQUAKE_SOURCES ?? 'sgc,usgs')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  mockEnabled: (process.env.EARTHQUAKE_MOCK_ENABLED ?? 'false') === 'true',
  mockIntervalMinutes: parseInt(process.env.EARTHQUAKE_MOCK_INTERVAL_MINUTES ?? '15', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  logFormat: isProd ? 'json' : (process.env.LOG_FORMAT ?? 'pretty'),
};

export const pushConfigured =
  Boolean(env.vapidPublicKey) && Boolean(env.vapidPrivateKey);
