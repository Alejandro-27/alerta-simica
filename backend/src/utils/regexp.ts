/**
 * Escapa caracteres especiales de expresiones regulares antes de usar un
 * valor de usuario en consultas $regex de MongoDB (evita ReDoS y
 * coincidencias no intencionadas).
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
