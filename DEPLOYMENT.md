# Despliegue — AlertaSísmica

Guía para llevar el sistema a producción. Todo el stack corre con Docker Compose; también se documenta un despliegue manual en VPS.

## Arquitectura

```
Usuario ──HTTPS──▶ Nginx/Caddy ──▶ frontend (Vite build, estático, PWA + SW)
                                └─▶ backend (Node/Express :4000)
                                        └─▶ MongoDB (Atlas o contenedor)
```

- El **frontend** es un build estático servido por Nginx (o Caddy). El service worker (`public/sw.js`) exige **HTTPS**.
- El **backend** expone la API, corre el scheduler (con lock distribuido en `distributed_locks`, seguro en multi-instancia) y envía push.
- **MongoDB**: usa Atlas (recomendado) o un contenedor. En multi-instancia usa el mismo cluster.

## Opción A — Docker Compose

`docker-compose.yml` en la raíz (el Dockerfile del backend usa contexto raíz para incluir `shared/`).

```bash
# 1. Configuración
cp backend/.env.example backend/.env
nano backend/.env     # MONGODB_URI, JWT secrets, VAPID, SGC_API_URL...

# 2. Construye y levanta
docker compose up -d --build

# 3. Seed (una sola vez)
docker compose exec backend pnpm run seed
```

El compose levanta: `backend` (puerto 4000), `mongo` (volumen persistente) y `frontend` (Nginx sirviendo el build de Vite, puerto 80).

### HTTPS (requisito para Web Push)

Con Caddy (compatible con Compose) es automático:

```
frontend:
  image: caddy:2
  ports: ["443:443", "80:80"]
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - ./frontend/dist:/srv:ro
```

```
alertasimica.com {
    root * /srv
    try_files {path} /index.html
    reverse_proxy /api* backend:4000
    encode gzip
    header X-Content-Type-Options nosniff
}
```

## Opción B — Manual (VPS Ubuntu)

```bash
# Backend
cd backend && pnpm install --frozen-lockfile && pnpm run build
cp .env.example .env && nano .env
pnpm run seed
pnpm start  # dist/backend/src/server.js — PM2: pm2 start dist/backend/src/server.js --name alertasimica

# Frontend
cd frontend && pnpm install --frozen-lockfile && pnpm run build   # → frontend/dist

# Nginx
# site: /etc/nginx/sites-available/alertasimica
server {
    listen 80;
    server_name alertasimica.com;
    location / { root /srv/alertasimica/frontend/dist; try_files $uri /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
}
# certbot --nginx -d alertasimica.com
```

## Variables críticas en producción

| Variable | Valor recomendado |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas con `retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 48` |
| `FRONTEND_URL` / `CORS_ORIGIN` | Tu dominio HTTPS |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `pnpm run vapid:generate` (necesarias para push) |
| `SGC_API_URL` | Endpoint oficial del SGC |
| `LOG_FORMAT` | `json` (para ingestión de logs) |
| `EARTHQUAKE_POLL_ENABLED` | `true` (solo en la instancia que ejecuta el scheduler) |

## Verificación post-despliegue

1. `curl https://tu-dominio/api/health/ready` → `{ status: "ready", mongo: true }`
2. `/admin` → configurar motor de alertas y revisar estado de fuentes en `/admin/sources`.
3. Enviar push de prueba desde `/admin` (panel Config) y recibirlo en el navegador del dispositivo.
4. Abrir la app en Android/iOS y verificar que se puede instalar como PWA (Add to Home Screen).
