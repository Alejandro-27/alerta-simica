import { Request, Response, NextFunction } from 'express';

/**
 * Sanitización básica anti NoSQL-injection:
 * elimina operadores $, claves con "." y claves de prototype pollution
 * (__proto__, constructor, prototype) de query/body/params.
 * (Complementa la validación Zod por endpoint.)
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeValue(value: unknown, key: string, parent: Record<string, unknown>): void {
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) sanitizeValue(item, key, item as Record<string, unknown>);
      }
      return;
    }
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.') || DANGEROUS_KEYS.has(k)) {
        delete (value as Record<string, unknown>)[k];
        continue;
      }
      sanitizeValue(v, k, value as Record<string, unknown>);
    }
    return;
  }
  if (typeof value === 'string' && (value.startsWith('$') || value.includes('.'))) {
    void key;
    void parent;
  }
}

export function mongoSanitize(req: Request, _res: Response, next: NextFunction) {
  sanitizeValue(req.body, '', req.body as Record<string, unknown>);
  sanitizeValue(req.query, '', req.query as Record<string, unknown>);
  sanitizeValue(req.params, '', req.params as Record<string, unknown>);
  next();
}
