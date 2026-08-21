import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'El nombre es obligatorio').max(80),
  lastName: z.string().trim().min(2, 'El apellido es obligatorio').max(80),
  email: z.string().trim().email('Correo inválido').max(160),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(160),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128)
    .optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000).nullable().optional(),
});

export const updateManualLocationSchema = z.object({
  country: z.string().trim().max(80).default('Colombia'),
  department: z.string().trim().max(80),
  municipality: z.string().trim().max(80),
});

export const updateAlertSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  minimumMagnitude: z.number().min(0).max(10).optional(),
  alertRadiusKm: z.number().min(1).max(2000).optional(),
  nearbyAlerts: z.boolean().optional(),
  nationalAlerts: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
});

export const subscribePushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('endpoint inválido'),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(10),
    }),
  }),
  device: z.string().max(120).optional(),
  browser: z.string().max(80).optional(),
  platform: z.string().max(40).optional(),
});
