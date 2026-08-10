# Checklist de producción — AlertaSísmica

Revisa cada punto antes de exponer el sistema a usuarios reales.

## Seguridad

- [ ] `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` generados con `openssl rand -hex 48`, diferentes entre sí y solo en el servidor.
- [ ] `CORS_ORIGIN` limita a tu dominio real (nunca `*` con credenciales).
- [ ] MongoDB: Atlas con VPC/allowlist de IPs del servidor, usuario con rol mínimo, TLS y auth habilitadas.
- [ ] Nginx/Caddy con HTTPS obligatorio (Let's Encrypt) y redirect HTTP→HTTPS. Web Push **no funciona sin HTTPS** (excepto `localhost`).
- [ ] Headers de seguridad activos (`helmet` ya incluido) y `X-Content-Type-Options: nosniff`.
- [ ] Rate limits verificados: global `100/min`, auth y push más estrictos. Ajustar a tu tráfico.
- [ ] Backups de MongoDB configurados (Atlas PITR o `mongodump` diario).
- [ ] Logs en formato JSON con rotación (Docker: driver `json-file` con `max-size`).

## Notificaciones push

- [ ] `pnpm run vapid:generate` ejecutado; `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en `.env`; reiniciado el backend.
- [ ] `/api/push/public-key` devuelve `{ configured: true }`.
- [ ] Push de prueba enviado desde `/admin` y recibido en Chrome, Firefox y un Android.
- [ ] Probar expiración de suscripción: al recibir `404 NotRegistered` en el envío, el sistema la elimina automáticamente (sin reintentos infinitos).
- [ ] Servicio de notificaciones monitoreado (métricas de `delivered`/`failed` en dashboard admin).

## Fuentes de datos

- [ ] `SGC_API_URL` apuntando al endpoint oficial actual (el adaptador soporta GeoJSON FeatureCollection, ArcGIS FeatureServer y arreglos). Si falla, `/admin/sources` muestra el error y el sistema continúa con USGS.
- [ ] `USGS_API_URL` configurado como fallback.
- [ ] En `/admin/sources`: `status: ok` y `lastRunAt`/`lastSuccessAt` actualizándose cada ciclo.
- [ ] Config del motor revisada: magnitud mínima, profundidad, radio de alerta y umbral de «posible afectación» según el criterio del operador.
- [ ] Se entiende y documenta el **limitante oficial**: los datos del SGC/USGS llegan con minutos de retraso; esto **no es alerta temprana**. Verificarlo en el disclaimer público.

## Datos y cuentas

- [ ] `pnpm run seed` corrido una sola vez (no exponer credenciales por defecto).
- [ ] Contraseña del admin por defecto **cambiada inmediatamente**.
- [ ] Eliminada (o desactivada vía config) la fuente `mock` en producción: `EARTHQUAKE_MOCK_ENABLED=false`. Los eventos demo jamás deben mezclarse con los reales.
- [ ] Prueba de deduplicación: un mismo evento procesado dos veces no genera notificaciones duplicadas (índice único `userId+earthquakeId+type`).

## Operación y monitoreo

- [ ] `/api/health/ready` usado en healthchecks de Docker/K8s.
- [ ] Monitoreo de errores (Sentry u otro) o al menos alertas sobre `LOG_LEVEL=error` en el sumidero de logs.
- [ ] Scheduler con lock distribuido verificado: en multi-instancia solo una corre la ingesta (colección `distributed_locks`).
- [ ] Alertas de latencia: el scheduler registra duraciones; revisar si la ingesta tarda más que `EARTHQUAKE_POLL_INTERVAL_SECONDS`.

## Cumplimiento y transparencia

- [ ] Página pública de Términos y Privacidad accesible desde el footer (rutas `/terms`, `/privacy`).
- [ ] Consentimiento explícito para: geolocalización, notificaciones push y tratamiento de datos personales (registro).
- [ ] Derecho de borrado implementado y funcional: `/user/account` (DELETE) elimina cuenta + suscripciones push. Prueba manual.
- [ ] Descargo de responsabilidad visible en toda la app (footer/header del Layout): el sistema no realiza alerta temprana ni sustituye a las autoridades (SGC, UNGRD, Defensa Civil).
- [ ] Revisión legal del texto de disclaimer/privacidad con un abogado local si el operador lo requiere.
