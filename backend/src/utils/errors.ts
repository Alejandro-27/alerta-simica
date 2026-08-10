export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Acceso denegado') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }

  static serviceUnavailable(message = 'Servicio no disponible') {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }
}

import { Request, Response, NextFunction } from 'express';

/** Envuelve controladores async y pasa errores al error handler central. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
