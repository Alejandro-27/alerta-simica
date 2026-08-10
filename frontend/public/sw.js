/* AlertaSísmica Service Worker
 * - Recibe Web Push y muestra notificaciones
 * - Al tocar una notificación abre /earthquakes/:id
 * - Cache de assets (app shell) para funcionamiento offline
 * - Fallback offline con última información disponible
 */
const VERSION = 'v1.0.0';
const CACHE_STATIC = `alertasimica-static-${VERSION}`;
const CACHE_API = `alertasimica-api-${VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('alertasimica-') && k !== CACHE_STATIC && k !== CACHE_API)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ---------- Web Push ---------- */

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'Evento sísmico detectado';
  const options = {
    body: data.body || 'Consulta los detalles del evento.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/',
      eventId: data.eventId || null,
      type: data.type || 'SYSTEM_NOTIFICATION',
    },
    // tag único por (tipo, evento): evita notificaciones duplicadas en pantalla
    tag: data.eventId ? `${data.type}-${data.eventId}` : `${data.type}-${Date.now()}`,
    renotify: true,
    requireInteraction: data.type === 'EARTHQUAKE_ALERT' || data.type === 'EARTHQUAKE_DETECTED',
    timestamp: Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url).catch(() => undefined);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});

/* ---------- Estrategias de cache ---------- */

// App shell: cache-first (los assets de Vite llevan hash).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // OSM tiles y demás: red

  // API: network-first con respaldo en cache (últimos datos conocidos).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE_API)
            .then((cache) => cache.put(request, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (request.headers.get('accept')?.includes('text/html')) {
            return Response.json({ error: 'OFFLINE', message: 'Sin conexión' }, { status: 503 });
          }
          return Response.json(
            { error: 'OFFLINE', message: 'Sin conexión a la red' },
            { status: 503 },
          );
        }),
    );
    return;
  }

  // Navegación: network-first, fallback app shell cacheada u offline.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return caches.match('/offline.html');
        }),
    );
    return;
  }

  // Assets estáticos: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith('/assets/')) {
            const copy = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
