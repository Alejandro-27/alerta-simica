# API — AlertaSísmica

Base URL: `http://localhost:4000/api` (en producción, tu dominio). Formato JSON. Los endpoints marcados 🔒 requieren `Authorization: Bearer <accessToken>`, los marcados 👑 requieren además rol `admin`.

- Autenticación: token de acceso (15 min por defecto) + refresh token (30 días). El frontend renueva automáticamente con `/auth/refresh`.
- Errores: `{ error: { code, message } }` con el código HTTP correspondiente. Errores de validación incluyen `details`.
- Límites de tasa: global `100 req/min`; auth y push tienen límites propios más estrictos.

## Auth

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` | Registro. Body: `{ name, email, password }`. 201 con `{ user, tokens }` |
| POST | `/auth/login` | Body: `{ email, password }` → `{ user, tokens }` |
| POST | `/auth/refresh` | Body: `{ refreshToken }` → `{ tokens }` |
| POST | `/auth/forgot-password` | Body: `{ email }` → `{ message }`. Genera token de reset (válido 1 h, un solo uso) |
| POST | `/auth/reset-password` | Body: `{ token, password }` → `{ message }` |
| POST | `/auth/logout` | 🔒 Revoca el refresh token (`tokenVersion++`) → 204 |
| GET | `/auth/me` | 🔒 Perfil del usuario → `{ user }` |

`user` (público): `{ id, name, email, role, location, locationManual, alertSettings, pushEnabled, createdAt, updatedAt }`. Nunca incluye `passwordHash` ni secretos.

## Sismos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/earthquakes?page=1&pageSize=20&source=&minMagnitude=&country=CO` | Lista paginada → `{ items, total, page, pageSize, totalPages }` |
| GET | `/earthquakes/recent?hours=48` | Últimos eventos (máx. 50, excluye demo) |
| GET | `/earthquakes/:id` | Detalle → `{ earthquake }` |

`earthquake`: `{ id, externalId, source, sourceLabel, magnitude, magnitudeType, latitude, longitude, depth, place, eventTime, tsunami, felt, alertLevel, status, sourceUrl, firstDetectedAt, lastSeenAt, demo, distanceKm, level, hasRawData }`.
- `level` (solo `earthquakes/:id` calcula distancia al usuario; el badge `level` se deriva exclusivamente de la alerta oficial de la fuente, `null` si no hay).
- `distanceKm`: distancia del epicentro a la ubicación registrada del usuario (solo con sesión y ubicación).

## Usuario

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/user/profile` | 🔒 → `{ user }` |
| PUT | `/user/profile` | 🔒 Body: `{ name?, email?, currentPassword?, newPassword? }` |
| PUT | `/user/location` | 🔒 Body: `{ latitude, longitude, accuracy? }` |
| PUT | `/user/location/manual` | 🔒 Body: `{ country, department, municipality }` |
| DELETE | `/user/location` | 🔒 Elimina la ubicación (deja de evaluar afectación) |
| GET | `/user/alerts` | 🔒 → `{ settings }` |
| PUT | `/user/alerts` | 🔒 Body: `{ minimumMagnitude?, enabled?, highMagnitudeNotifications?, radiusKm? }` |
| DELETE | `/user/account` | 🔒 Elimina la cuenta y sus suscripciones push → 204 |

`alertSettings`: `{ enabled, minimumMagnitude, radiusKm, highMagnitudeNotifications }`. La magnitud mínima del usuario se combina con la global (se usa la mayor).

## Push

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/push/public-key` | → `{ publicKey, configured }` (sin auth, para el service worker) |
| GET | `/push/status` | 🔒 Estado del dispositivo actual → `{ supported, permission, subscribed, subscription }` |
| POST | `/push/subscribe` | 🔒 Guarda suscripción. Body: `{ subscription: { endpoint, keys: { p256dh, auth } }, device?, browser?, platform? }` |
| DELETE | `/push/unsubscribe` | 🔒 Elimina la suscripción del dispositivo actual |

Respuestas 503 si VAPID no está configurado.

## Admin 👑

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/admin/dashboard` | Métricas: totales, últimos 24 h, usuarios, suscripciones activas, push status |
| GET | `/admin/users?page=&q=` | Lista usuarios (sin secretos) |
| PATCH | `/admin/users/:id` | Body: `{ role?, banned?, name? }` |
| GET | `/admin/earthquakes?page=` | Lista eventos (incluye demo) |
| DELETE | `/admin/earthquakes/:id` | Borra un evento y sus notificaciones |
| GET | `/admin/notifications?page=` | Historial de notificaciones enviadas |
| GET | `/admin/logs?page=&level=` | Logs del sistema (sumidero capped) |
| GET | `/admin/sources` | Estado de cada fuente: `{ name, enabled, status, lastRunAt, lastSuccessAt, lastError, eventsIngested }` |
| GET | `/admin/config` | → `{ config }` |
| PUT | `/admin/config` | Body: `{ minimumMagnitude, maximumDepth, alertRadiusKm, highMagnitudeThreshold, enabled, country, sources, pollIntervalSeconds }` (se aplica en el siguiente ciclo del scheduler) |
| POST | `/admin/push/test` | Body: `{ title, body, userId? }` → `{ delivered, failed, targets }`. Vacío envía a todos los usuarios con push |

## Health

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | `{ status, uptime, mongo, memory }` |
| GET | `/health/ready` | Listo para recibir tráfico (`ready` + `mongo` OK). Usar en probes de Docker/K8s |

## Notificaciones (eventos al usuario)

La evaluación de afectación se hace **en el backend** al procesar cada evento:

1. El evento supera la magnitud mínima y profundidad máxima globales.
2. Se buscan usuarios con alertas activas, push habilitado y ubicación (GPS o manual).
3. Se calcula la distancia epicentro–usuario con haversine (`shared/src/index.ts`).
4. Si `distance ≤ radiusKm` del usuario → notificación `HIGH`. Si además `magnitude ≥ highMagnitudeThreshold` → `CRITICAL` («posible afectación»). Sismos sin ubicación registrada → `WARNING` (informativa) solo si la fuente oficial lo reporta relevante.
5. Deduplicación por `userId + earthquakeId + type` (índice único parcial): un usuario recibe cada notificación una sola vez.

Los eventos `demo:true` **nunca** generan notificaciones.
