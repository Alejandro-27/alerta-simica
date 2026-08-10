import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidators';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from '../services/authService';
import { ApiError } from '../utils/errors';
import { toPublicUser } from '../services/userService';
import { env } from '../config/env';

export async function register(req: import('express').Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, tokens } = await registerUser(input);
  res.status(201).json({
    user: toPublicUser(user.toObject()),
    tokens,
  });
}

export async function login(req: import('express').Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, tokens } = await loginUser(input.email, input.password);
  res.json({
    user: toPublicUser(user.toObject()),
    tokens,
  });
}

export async function refresh(req: import('express').Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await refreshAccessToken(refreshToken);
  res.json({ tokens });
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.user?.id) await logoutUser(req.user.id);
  res.status(204).send();
}

export async function me(req: AuthRequest, res: Response) {
  const { User } = await import('../models/User');
  const doc = await User.findById(req.user!.id);
  if (!doc) throw ApiError.notFound('Usuario no encontrado');
  res.json({ user: toPublicUser(doc.toObject()) });
}

export async function forgotPassword(req: import('express').Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const token = await requestPasswordReset(email);
  if (token && !env.isProd) {
    // En desarrollo, el enlace se deja visible en los logs del servidor.
    const link = `${env.frontendUrl}/reset-password?token=${token}`;
    (await import('../utils/logger')).logger.info(
      { link },
      'Enlace de restablecimiento de contraseña (solo desarrollo)',
    );
  }
  // Respuesta genérica: no revela si el correo existe.
  res.json({
    message:
      'Si el correo existe, recibirás un enlace de restablecimiento. (En desarrollo, revisa los logs del servidor.)',
  });
}

export async function resetPasswordAction(req: import('express').Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await resetPassword(input.token, input.password);
  res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
}
