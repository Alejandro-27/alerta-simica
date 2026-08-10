import mongoose from 'mongoose';
import { User } from '../models/User';
import { calculateDistanceKm } from '../../../shared/src';
import type { AlertSettings, UserLocation } from '../../../shared/src';
import type { PublicUser } from '../../../shared/src';

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  minimumMagnitude: 4.5,
  alertRadiusKm: 100,
  nearbyAlerts: true,
  nationalAlerts: true,
  soundEnabled: true,
  dailySummary: false,
};

export interface PublicUserSource {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  active?: boolean;
  phone?: string | null;
  location?: { latitude?: number | null; longitude?: number | null; accuracy?: number | null; updatedAt?: Date | null } | null;
  locationManual?: { country?: string; department?: string; municipality?: string } | null;
  alertSettings?: Partial<AlertSettings>;
  pushEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

function normalizeLocation(
  loc: PublicUserSource['location'],
): UserLocation | null {
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : null,
    updatedAt: loc.updatedAt ? new Date(loc.updatedAt) : new Date(),
  };
}

export function toPublicUser(doc: PublicUserSource): PublicUser {
  return {
    id: String(doc._id),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    role: (doc.role ?? 'USER') as PublicUser['role'],
    active: doc.active ?? true,
    phone: doc.phone ?? null,
    location: normalizeLocation(doc.location),
    locationManual: doc.locationManual
      ? {
          country: doc.locationManual.country ?? 'Colombia',
          department: doc.locationManual.department ?? '',
          municipality: doc.locationManual.municipality ?? '',
        }
      : null,
    alertSettings: { ...DEFAULT_ALERT_SETTINGS, ...(doc.alertSettings ?? {}) },
    pushEnabled: doc.pushEnabled ?? false,
    createdAt: doc.createdAt ?? new Date(0),
    updatedAt: doc.updatedAt ?? new Date(0),
  };
}

export interface EligibleUser {
  userId: mongoose.Types.ObjectId;
  distanceKm: number | null;
  settings: AlertSettings;
}

export interface FindAffectedUsersOptions {
  /** límite de resultados para no saturar en un evento grande */
  limit?: number;
}

/**
 * Encuentra usuarios elegibles para una alerta de un evento:
 *  - usuarios con ubicación dentro del radio (nearbyAlerts)
 *  - usuarios sin ubicación o con nationalAlerts que pasan umbral
 * La consulta geográfica se hace en MongoDB (índice 2dsphere).
 */
export async function findAffectedUsers(
  event: { latitude: number; longitude: number; magnitude: number; depth: number },
  config: {
    minimumMagnitude: number;
    maximumDepth: number | null;
    alertRadiusKm: number;
  },
  opts: FindAffectedUsersOptions = {},
): Promise<EligibleUser[]> {
  const { limit = 500 } = opts;
  if (event.magnitude < config.minimumMagnitude) return [];
  if (config.maximumDepth !== null && event.depth > config.maximumDepth) return [];

  const users = await User.find(
    {
      active: true,
      'alertSettings.enabled': true,
    },
    { firstName: 1, lastName: 1, email: 1, role: 1, active: 1, phone: 1, location: 1, alertSettings: 1, createdAt: 1, updatedAt: 1 },
  )
    .limit(limit)
    .lean();

  const radius = Math.min(config.alertRadiusKm, 2000);
  const eligible: EligibleUser[] = [];

  for (const u of users) {
    const settings: AlertSettings = { ...DEFAULT_ALERT_SETTINGS, ...u.alertSettings };
    if (event.magnitude < (settings.minimumMagnitude ?? config.minimumMagnitude)) continue;
    let distanceKm: number | null = null;
    const loc = u.location as UserLocation | undefined;
    if (loc?.latitude !== undefined && loc?.longitude !== undefined) {
      distanceKm = calculateDistanceKm(event.latitude, event.longitude, loc.latitude, loc.longitude);
      const nearby = settings.nearbyAlerts && distanceKm <= radius;
      const national = settings.nationalAlerts;
      if (!nearby && !national) continue;
    } else if (!settings.nationalAlerts) {
      continue;
    }
    eligible.push({ userId: u._id, distanceKm, settings });
  }

  return eligible;
}
