import type {
  EarthquakeRecord,
  PublicUser,
  AlertSettings,
  AlertConfigurationPublic,
  HealthResponse,
  Paginated,
  SourceStatusPublic,
} from '@shared';

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = 'alertasimica_access';
const REFRESH_KEY = 'alertasimica_refresh';

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export interface ApiClientOptions {
  body?: unknown;
  token?: string | null;
  retry?: boolean;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

let refreshing: Promise<boolean> | null = null;

async function doFetch<T>(path: string, opts: ApiClientOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const token = opts.token ?? tokenStore.access;
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && opts.retry !== false && tokenStore.refresh) {
    const ok = await refreshSession();
    if (ok) return doFetch<T>(path, { ...opts, retry: false });
  }

  if (!res.ok) {
    let error = 'Ocurrió un error';
    let code = 'ERROR';
    let details: unknown;
    try {
      const data = await res.json();
      error = data.message ?? error;
      code = data.error ?? code;
      details = data.details;
    } catch {
      /* cuerpo no JSON */
    }
    throw new ApiError(res.status, code, error, details);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokenStore.refresh }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        const data = await res.json();
        tokenStore.set(data.tokens);
        return true;
      } catch {
        tokenStore.clear();
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, opts: ApiClientOptions = {}): Promise<T> {
  return doFetch<T>(path, opts);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return doFetch<T>(path, { body, method: 'POST' });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return doFetch<T>(path, { body, method: 'PUT' });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return doFetch<T>(path, { body, method: 'PATCH' });
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return doFetch<T>(path, { body, method: 'DELETE' });
}

export function logoutLocally() {
  tokenStore.clear();
}

/* ---------------- Endpoints tipados ---------------- */

export const endpoints = {
  health: () => apiFetch<HealthResponse>('/health'),
  healthReady: () => apiFetch<{ status: string }>('/health/ready'),

  register: (b: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    apiPost<{ user: PublicUser; tokens: { accessToken: string; refreshToken: string } }>('/auth/register', b),
  login: (b: { email: string; password: string }) =>
    apiPost<{ user: PublicUser; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', b),
  me: () => apiFetch<{ user: PublicUser }>('/auth/me'),
  forgotPassword: (email: string) => apiPost<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiPost<{ message: string }>('/auth/reset-password', { token, password }),
  logout: () => apiPost<never>('/auth/logout', {}),

  earthquakes: (params: string) => apiFetch<Paginated<EarthquakeRecord>>(`/earthquakes?${params}`),
  earthquake: (id: string) => apiFetch<{ earthquake: EarthquakeRecord }>(`/earthquakes/${id}`),
  recentEarthquakes: (hours = 48, scope: 'co' | 'world' = 'co') =>
    apiFetch<{ items: EarthquakeRecord[]; hours: number; scope: string }>(`/earthquakes/recent?hours=${hours}&scope=${scope}`),

  getProfile: () => apiFetch<{ user: PublicUser }>('/user/profile'),
  updateProfile: (b: Record<string, unknown>) => apiPut<{ user: PublicUser }>('/user/profile', b),
  updateLocation: (b: { latitude: number; longitude: number; accuracy?: number | null }) =>
    apiPut<{ user: PublicUser }>('/user/location', b),
  updateManualLocation: (b: { country: string; department: string; municipality: string }) =>
    apiPut<{ user: PublicUser }>('/user/location/manual', b),
  deleteLocation: () => apiDelete<{ user: PublicUser }>('/user/location'),
  getAlertSettings: () => apiFetch<{ alertSettings: AlertSettings }>('/user/alerts'),
  updateAlertSettings: (b: Partial<AlertSettings>) => apiPut<{ alertSettings: AlertSettings }>('/user/alerts', b),
  deleteAccount: () => apiDelete<never>('/user/account'),

  pushPublicKey: () => apiFetch<{ publicKey: string; configured: boolean }>('/push/public-key'),
  pushStatus: () => apiFetch<{ supported: boolean; configured: boolean; subscribed: boolean; subscriptionCount: number }>('/push/status'),
  pushSubscribe: (b: { subscription: PushSubscriptionJSON; device?: string; browser?: string; platform?: string }) =>
    apiPost<{ subscription: unknown }>('/push/subscribe', b),
  pushUnsubscribe: (endpoint: string) => apiDelete<never>('/push/unsubscribe', { endpoint }),

  adminDashboard: () => apiFetch<AdminDashboard>('/admin/dashboard'),
  adminUsers: (params: string) => apiFetch<Paginated<AdminUser>>(`/admin/users?${params}`),
  adminUpdateUser: (id: string, b: { active?: boolean; role?: 'ADMIN' | 'USER' }) =>
    apiPatch<{ user: PublicUser }>(`/admin/users/${id}`, b),
  adminEarthquakes: (params: string) => apiFetch<Paginated<AdminEarthquake>>(`/admin/earthquakes?${params}`),
  adminDeleteEarthquake: (id: string) => apiDelete<never>(`/admin/earthquakes/${id}`),
  adminNotifications: (params: string) => apiFetch<Paginated<AdminNotification>>(`/admin/notifications?${params}`),
  adminLogs: (params: string) => apiFetch<Paginated<AdminLog>>(`/admin/logs?${params}`),
  adminSources: () => apiFetch<{ items: AdminSource[] }>('/admin/sources'),
  adminConfig: () => apiFetch<{ config: AlertConfigurationPublic }>('/admin/config'),
  adminUpdateConfig: (b: Partial<AlertConfigurationPublic>) => apiPut<{ config: AlertConfigurationPublic }>('/admin/config', b),
  adminPushTest: (b: { title?: string; body?: string; userId?: string }) =>
    apiPost<{ targets: number; delivered: number; failed: number }>('/admin/push/test', b),
};

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface AdminDashboard {
  lastEvent: EarthquakeRecord | null;
  counts: {
    last24h: number;
    lastWeek: number;
    activeUsers: number;
    pushUsers: number;
    alertsSent: number;
    alertsFailed: number;
  };
  maxMagnitudeWeek: { magnitude: number; place: string; eventTime: Date } | null;
  sources: (SourceStatusPublic & { configured: boolean; enabled: boolean })[];
  config: AlertConfigurationPublic;
}

export interface AdminUser extends PublicUser {
  pushCount: number;
}

export interface AdminEarthquake {
  id: string;
  externalId: string;
  source: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  place: string;
  eventTime: Date;
  firstDetectedAt: Date;
  lastSeenAt: Date;
  demo: boolean;
}

export interface AdminNotification {
  id: string;
  userId: string;
  user: { firstName?: string; lastName?: string; email?: string } | null;
  earthquakeId: string | null;
  type: string;
  title: string;
  body: string;
  level: string;
  sentAt: Date;
  delivered: boolean;
  error: string | null;
  provider: string;
}

export interface AdminLog {
  id: string;
  level: string;
  category: string;
  message: string;
  meta: Record<string, unknown>;
  timestamp: Date;
}

export interface AdminSource {
  source: string;
  label: string;
  configured: boolean;
  enabled: boolean;
  status: string;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  lastEventAt: Date | null;
  eventsFound: number;
  processingTimeMs: number | null;
}

export function isOfflineError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503 && err.code === 'OFFLINE';
}
