import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/** Error handler centralizado: nunca expone detalles internos al cliente. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details ?? undefined,
    });
  }
  // Errores de MongoDB (índices únicos, etc.)
  const mongoErr = err as { code?: number; message?: string; keyValue?: Record<string, unknown>; name?: string };
  if (mongoErr.code === 11000) {
    // Solo nombres de campos, nunca los valores (no exponer datos internos).
    return res.status(409).json({
      error: 'DUPLICATE_KEY',
      message: 'El recurso ya existe',
      details: mongoErr.keyValue ? { fields: Object.keys(mongoErr.keyValue) } : undefined,
    });
  }
  if ((err as { name?: string }).name === 'ValidationError' || (err as { name?: string }).name === 'CastError') {
    return res.status(422).json({
      error: 'INVALID_DATA',
      message: 'Datos inválidos para la base de datos',
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Error no manejado');
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Ocurrió un error interno',
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
}
