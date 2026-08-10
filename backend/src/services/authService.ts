import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { ApiError } from '../utils/errors';
import { env } from '../config/env';
import { writeLog } from '../models/SystemLog';
import type { AlertSettings } from '../../../shared/src';

const ACCESS_TOKEN_AGE_MS = 15 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function registerUser(input: RegisterInput): Promise<{ user: InstanceType<typeof User>; tokens: AuthTokens }> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Ya existe una cuenta con este correo');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    passwordHash,
    phone: input.phone?.trim() || null,
    role: 'USER',
    active: true,
    tokenVersion: 0,
  });

  await writeLog('info', 'auth', 'Usuario registrado', { userId: String(user._id) });
  return { user, tokens: await issueTokens(user) };
}

export async function loginUser(email: string, password: string): Promise<{ user: InstanceType<typeof User>; tokens: AuthTokens }> {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Credenciales inválidas');
  if (!user.active) throw ApiError.forbidden('Tu cuenta está desactivada. Contacta al administrador.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

  await writeLog('info', 'auth', 'Inicio de sesión', { userId: String(user._id) });
  return { user, tokens: await issueTokens(user) };
}

export async function issueTokens(user: {
  _id: mongoose.Types.ObjectId;
  role?: string;
  tokenVersion?: number;
}): Promise<AuthTokens> {
  const payload = { sub: String(user._id), role: user.role ?? 'USER', tv: user.tokenVersion ?? 0 };
  const accessToken = jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign(
    { ...payload, kind: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn } as jwt.SignOptions,
  );
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_AGE_MS };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as jwt.JwtPayload;
  } catch {
    throw ApiError.unauthorized('Sesión expirada. Inicia sesión de nuevo.');
  }
  if (decoded.kind !== 'refresh') throw ApiError.unauthorized('Token inválido');

  const user = await User.findById(decoded.sub);
  if (!user) throw ApiError.unauthorized('Usuario no existe');
  if (!user.active) throw ApiError.forbidden('Tu cuenta está desactivada');
  if (user.tokenVersion !== decoded.tv) throw ApiError.unauthorized('Sesión revocada');

  return issueTokens(user);
}

export async function logoutUser(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await writeLog('info', 'auth', 'Cierre de sesión', { userId });
}

export async function requestPasswordReset(email: string): Promise<string> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Siempre responde igual para no revelar correos existentes.
  if (!user) return '';
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  await writeLog('info', 'auth', 'Solicitud de restablecimiento de contraseña', {
    userId: String(user._id),
  });
  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await PasswordResetToken.findOne({ tokenHash, usedAt: null });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('El enlace es inválido o ya expiró');
  }
  const user = await User.findById(record.userId);
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordHash = passwordHash;
  user.tokenVersion += 1; // revoca sesiones anteriores
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await writeLog('info', 'auth', 'Contraseña restablecida', { userId: String(user._id) });
}

export function getDefaultAlertSettings(): AlertSettings {
  return {
    enabled: true,
    minimumMagnitude: env.earthquakeMinMagnitude,
    alertRadiusKm: env.earthquakeAlertRadiusKm,
    nearbyAlerts: true,
    nationalAlerts: true,
    soundEnabled: true,
    dailySummary: false,
  };
}
