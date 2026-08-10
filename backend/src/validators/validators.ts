import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const earthquakeListQuerySchema = paginationSchema.extend({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  minMagnitude: z.coerce.number().min(-2).max(12).optional(),
  maxMagnitude: z.coerce.number().min(-2).max(12).optional(),
  source: z.string().optional(),
  department: z.string().optional(),
  municipality: z.string().optional(),
  maxDepth: z.coerce.number().min(0).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'Formato lat,lon')
    .optional(),
});

export const adminEarthquakeQuerySchema = earthquakeListQuerySchema.extend({
  demo: z.enum(['true', 'false']).optional(),
});

export const adminUsersQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  active: z.enum(['true', 'false']).optional(),
  sort: z.string().optional(),
});

export const adminNotificationsQuerySchema = paginationSchema.extend({
  type: z.enum(['EARTHQUAKE_DETECTED', 'EARTHQUAKE_ALERT', 'SYSTEM_NOTIFICATION', 'TEST_NOTIFICATION']).optional(),
  delivered: z.enum(['true', 'false']).optional(),
  userId: z.string().optional(),
});

export const adminLogsQuerySchema = paginationSchema.extend({
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  category: z
    .enum(['system', 'earthquake', 'alert', 'push', 'source', 'auth', 'admin', 'job'])
    .optional(),
});

export const updateConfigSchema = z.object({
  minimumMagnitude: z.number().min(0).max(10).optional(),
  maximumDepth: z.number().min(0).max(1000).nullable().optional(),
  alertRadiusKm: z.number().min(1).max(2000).optional(),
  highMagnitudeThreshold: z.number().min(0).max(10).optional(),
  enabled: z.boolean().optional(),
  country: z.string().trim().max(80).optional(),
  regions: z.array(z.string().trim().max(80)).optional(),
  cities: z.array(z.string().trim().max(80)).optional(),
  sources: z.record(z.object({ enabled: z.boolean() })).optional(),
  pollIntervalSeconds: z.number().int().min(10).max(3600).optional(),
});

export const pushTestSchema = z.object({
  userId: z.string().optional(),
  title: z.string().trim().min(1).max(120).default('Prueba de notificación'),
  body: z.string().trim().min(1).max(300).default('Si recibes esto, las notificaciones funcionan.'),
});

export const adminUserUpdateSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
});
