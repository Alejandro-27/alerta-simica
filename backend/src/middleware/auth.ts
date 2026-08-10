import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { User } from '../models/User';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'USER';
  };
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();
    const token = header.slice(7);
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtAccessSecret) as jwt.JwtPayload;
    } catch {
      throw ApiError.unauthorized('Token inválido o expirado');
    }
    if (!decoded.sub || !mongoose.isValidObjectId(decoded.sub)) {
      throw ApiError.unauthorized();
    }
    const user = await User.findById(decoded.sub).lean();
    if (!user || !user.active) throw ApiError.unauthorized('Usuario no activo');
    if (user.tokenVersion !== decoded.tv) throw ApiError.unauthorized('Sesión revocada');
    req.user = { id: String(user._id), role: user.role as 'ADMIN' | 'USER' };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(ApiError.forbidden('Se requieren permisos de administrador'));
  }
  next();
}
