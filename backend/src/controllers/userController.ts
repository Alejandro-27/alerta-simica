import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  updateProfileSchema,
  updateLocationSchema,
  updateManualLocationSchema,
  updateAlertSettingsSchema,
} from '../validators/authValidators';
import { User } from '../models/User';
import { toPublicUser } from '../services/userService';
import { ApiError } from '../utils/errors';
import bcrypt from 'bcryptjs';

async function getCurrentUser(req: AuthRequest): Promise<InstanceType<typeof User>> {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('Usuario no encontrado');
  return user;
}

export async function getProfile(req: AuthRequest, res: Response) {
  const user = await getCurrentUser(req);
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const user = await getCurrentUser(req);
  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.password) {
    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.tokenVersion += 1;
  }
  await user.save();
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function updateLocation(req: AuthRequest, res: Response) {
  const input = updateLocationSchema.parse(req.body);
  const user = await getCurrentUser(req);
  user.location = {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy ?? null,
    updatedAt: new Date(),
  };
  await user.save();
  await (await import('../models/SystemLog')).writeLog('info', 'system', 'Ubicación actualizada', {
    userId: String(user._id),
  });
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function updateManualLocation(req: AuthRequest, res: Response) {
  const input = updateManualLocationSchema.parse(req.body);
  const user = await getCurrentUser(req);
  user.locationManual = { ...input };
  await user.save();
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function deleteLocation(req: AuthRequest, res: Response) {
  const user = await getCurrentUser(req);
  delete (user as { location?: unknown }).location;
  delete (user as { locationManual?: unknown }).locationManual;
  await user.save();
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function getAlertSettings(req: AuthRequest, res: Response) {
  const user = await getCurrentUser(req);
  res.json({ alertSettings: user.alertSettings });
}

export async function updateAlertSettings(req: AuthRequest, res: Response) {
  const input = updateAlertSettingsSchema.parse(req.body);
  const user = await getCurrentUser(req);
  user.alertSettings = { ...user.alertSettings, ...input };
  await user.save();
  res.json({ alertSettings: user.alertSettings });
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  const user = await getCurrentUser(req);
  await user.deleteOne();
  const { PushSubscription } = await import('../models/PushSubscriptionDoc');
  await PushSubscription.deleteMany({ userId: user._id });
  res.status(204).send();
}
