# AlertaSísmica

Plataforma web (PWA) de **monitoreo sísmico para Colombia** con notificaciones push. Consume eventos del Servicio Geológico Colombiano (SGC) y USGS, procesa, deduplica y notifica a los usuarios según su ubicación registrada.

> **Importante:** este sistema **NO realiza alerta temprana**. No hay forma fiable de predecir sismos. Las notificaciones que genera son **informativas** y, cuando el usuario registra su ubicación, indican una **posible afectación** según distancia al epicentro. Los datos de demostración (mock) están siempre marcados como `demo` y **nunca generan alertas** ni se mezclan con datos reales.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Leaflet |
| Backend | Node.js + Express + TypeScript |
| Base de datos | MongoDB (Mongoose) |
| Notificaciones | Web Push (VAPID, protocolo Push API) |
| Pruebas | Vitest (backend, 63 tests) + mongodb-memory-server |

## Estructura

```
AlertaSísmica/
├── shared/      # Tipos, constantes y utilidades compartidas (fuente única de verdad)
├── backend/     # API REST, procesador de sismos, scheduler, push, admin
│   ├── src/     # app.ts, models/, services/, adapters/, controllers/, routes/, jobs/, middleware/
│   └── tests/   # 63 tests (vitest)
├── frontend/    # PWA React (páginas, hooks, componentes, service worker)
├── scripts/     # scripts node puros (generar iconos PWA, VAPID)
├── docker-compose.yml
└── README.md
```

## Requisitos

- Node.js ≥ 18
- MongoDB ≥ 6 (o Atlas en producción)
- Node.js >= 18, pnpm >= 11

## Puesta en marcha (desarrollo)

### 1. Backend

```bash
cd backend
cp .env.example .env      # completa los valores (ver "Variables" abajo)
pnpm install
pnpm run seed              # crea admin (admin@alertasimica.co / Admin123!) y datos demo
pnpm run dev               # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm run dev               # http://localhost:5173
```

### 3. Notificaciones push (opcional, para activarlas)

```bash
cd backend
pnpm run vapid:generate    # imprime las llaves VAPID y las pega en .env
```

Si `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` están vacías, el push queda desactivado con manejo 503 y el health de push reporta `not_configured`. El resto del sistema funciona igual.

### Variables de entorno principales

| Variable | Descripción |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión MongoDB |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT (generar con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Llaves Web Push |
| `SGC_API_URL` | Endpoint SGC (GeoJSON, ArcGIS FeatureServer o arreglo). Vacía = fuente desactivada |
| `USGS_API_URL` | Feed USGS GeoJSON (fallback) |
| `FRONTEND_URL` / `CORS_ORIGIN` | URLs del frontend para CORS |
| `EARTHQUAKE_*` | Valores iniciales del motor de alertas (editables desde `/admin`) |

## Scripts útiles

| Comando (desde `backend/`) | Qué hace |
| --- | --- |
| `pnpm run dev` | Backend en modo watch |
| `pnpm run build` / `pnpm start` | Compila y corre en producción (salida en `dist/backend/src/`) |
| `pnpm test` | Corre los 63 tests |
| `pnpm run seed` | Crea admin y datos demo |
| `pnpm run vapid:generate` | Genera llaves VAPID |
| `pnpm run typecheck` | Typecheck sin emitir |

| Comando (desde `frontend/`) | Qué hace |
| --- | --- |
| `pnpm run dev` | Servidor de desarrollo |
| `pnpm run build` | Typecheck + build PWA (`dist/`) |
| `pnpm run preview` | Sirve el build localmente |

## Usuarios iniciales (seed)

| Rol | Email | Contraseña |
| --- | --- | --- |
| Admin | `admin@alertasimica.co` | `Admin123!` |
| Usuario demo | `usuario@alertasimica.co` | `Usuario123!` |

## Documentación

- [API.md](API.md) — Referencia completa de la API REST
- [DEPLOYMENT.md](DEPLOYMENT.md) — Despliegue en producción (Docker, VPS, HTTPS)
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) — Checklist antes de salir a producción

## Descargo de responsabilidad

AlertaSísmica consolida información pública de SGC y USGS y la entrega tal cual, sin edición. No constituye un sistema de alerta temprana ni sustituye a las autoridades oficiales de gestión del riesgo. Ante un sismo, prioriza la información y las indicaciones de las entidades oficiales (SGC, UNGRD, Defensa Civil).
