/** Serializadores para pino-http: nunca registrar credenciales. */
export function pinoHttpSerializer(req: Record<string, unknown>) {
  return {
    method: req.method,
    url: req.url,
    ip: req.remoteAddress,
    userAgent: (req.headers as Record<string, string>)?.['user-agent'],
  };
}
