import { Request, Response } from 'express';
import {
  adminUsersQuerySchema,
  adminNotificationsQuerySchema,
  adminLogsQuerySchema,
  updateConfigSchema,
  pushTestSchema,
  adminUserUpdateSchema,
  adminEarthquakeQuerySchema,
} from '../validators/validators';
import { escapeRegExp } from '../utils/regexp';
import { User } from '../models/User';
import { Earthquake } from '../models/Earthquake';
import { Notification } from '../models/Notification';
import { SystemLog, writeLog } from '../models/SystemLog';
import { SourceStatus } from '../models/SourceStatus';
import { getAlertConfig, updateAlertConfig, toPublicConfig } from '../services/alertConfigService';
import { pushService } from '../services/pushService';
import { ApiError } from '../utils/errors';
import { toPublicUser } from '../services/userService';
import { ProviderRegistry } from '../adapters';
import { env } from '../config/env';
import mongoose from 'mongoose';

export async function dashboard(req: Request, res: Response) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600_000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);

  const [lastEvent, last24h, lastWeek, maxMagnitudeWeek, activeUsers, pushUsers, notifications, failed, sources, config] =
    await Promise.all([
      Earthquake.findOne({ demo: { $ne: true } }).sort({ eventTime: -1 }).lean(),
      Earthquake.countDocuments({ demo: { $ne: true }, eventTime: { $gte: dayAgo } }),
      Earthquake.countDocuments({ demo: { $ne: true }, eventTime: { $gte: weekAgo } }),
      Earthquake.findOne({ demo: { $ne: true }, eventTime: { $gte: weekAgo } })
        .sort({ magnitude: -1 })
        .select({ magnitude: 1, place: 1, eventTime: 1, latitude: 1, longitude: 1, depth: 1 })
        .lean(),
      User.countDocuments({ active: true }),
      pushService.activeSubscriptionsCount(),
      Notification.countDocuments({ type: { $in: ['EARTHQUAKE_ALERT', 'EARTHQUAKE_DETECTED'] } }),
      Notification.countDocuments({ delivered: false }),
      SourceStatus.find().lean(),
      getAlertConfig(true),
    ]);

  const registry = new ProviderRegistry({
    sgcUrl: env.sgcApiUrl,
    usgsUrl: env.usgsApiUrl,
    mockEnabled: env.mockEnabled,
    mockIntervalMinutes: env.mockIntervalMinutes,
  });

  res.json({
    lastEvent,
    counts: {
      last24h,
      lastWeek,
      activeUsers,
      pushUsers,
      alertsSent: notifications,
      alertsFailed: failed,
    },
    maxMagnitudeWeek: maxMagnitudeWeek,
    sources: sources.map((s) => ({
      source: s.source,
      status: s.status,
      lastCheckedAt: s.lastCheckedAt,
      lastSuccessAt: s.lastSuccessAt,
      lastError: s.lastError,
      consecutiveFailures: s.consecutiveFailures,
      lastEventAt: s.lastEventAt,
      eventsFound: s.eventsFound,
      processingTimeMs: s.processingTimeMs,
      configured: registry.get(s.source)?.isConfigured() ?? false,
      enabled: config.sources[s.source]?.enabled ?? true,
    })),
    config: toPublicConfig(config),
  });
}

export async function listUsers(req: Request<unknown, unknown, unknown, Record<string, any>>, res: Response) {
  const q = adminUsersQuerySchema.parse(req.query);
  const filter: Record<string, any> = {};
  if (q.q) {
    const escaped = escapeRegExp(q.q);
    filter.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }
  if (q.role) filter.role = q.role;
  if (q.active !== undefined) filter.active = q.active === 'true';

  const sort: Record<string, 1 | -1> = {};
  if (q.sort === 'name') sort.firstName = 1;
  else if (q.sort === '-name') sort.firstName = -1;
  else sort.createdAt = -1;

  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
    User.countDocuments(filter),
  ]);

  const ids = items.map((u) => u._id);
  const pushAgg = await (await import('../models/PushSubscriptionDoc')).PushSubscription.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $match: { userId: { $in: ids }, active: true } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const pushByUser = new Map(pushAgg.map((p) => [String(p._id), p.count]));

  res.json({
    items: items.map((u) => ({
      ...toPublicUser(u as never),
      pushCount: pushByUser.get(String(u._id)) ?? 0,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize),
  });
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Id inválido');
  const input = adminUserUpdateSchema.parse(req.body);
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Usuario no encontrado');
  if (input.active !== undefined) user.active = input.active;
  if (input.role !== undefined) user.role = input.role;
  await user.save();
  await writeLog('info', 'admin', 'Usuario actualizado por administrador', {
    userId: String(user._id),
    patch: input,
  });
  res.json({ user: toPublicUser(user.toObject()) });
}

export async function listAdminEarthquakes(req: Request<unknown, unknown, unknown, Record<string, any>>, res: Response) {
  const q = adminEarthquakeQuerySchema.parse(req.query);
  const filter: Record<string, any> = {};
  if (q.demo !== undefined) filter.demo = q.demo === 'true';
  if (q.source) filter.source = q.source;
  if (q.minMagnitude !== undefined || q.maxMagnitude !== undefined) {
    filter.magnitude = {};
    if (q.minMagnitude !== undefined) filter.magnitude.$gte = q.minMagnitude;
    if (q.maxMagnitude !== undefined) filter.magnitude.$lte = q.maxMagnitude;
  }
  if (q.from || q.to) {
    filter.eventTime = {};
    if (q.from) filter.eventTime.$gte = new Date(q.from);
    if (q.to) filter.eventTime.$lte = new Date(q.to);
  }
  const [items, total] = await Promise.all([
    Earthquake.find(filter)
      .sort({ eventTime: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Earthquake.countDocuments(filter),
  ]);
  res.json({
    items: items.map((d) => ({
      id: String(d._id),
      externalId: d.externalId,
      source: d.source,
      magnitude: d.magnitude,
      latitude: d.latitude,
      longitude: d.longitude,
      depth: d.depth,
      place: d.place,
      eventTime: d.eventTime,
      firstDetectedAt: d.firstDetectedAt,
      lastSeenAt: d.lastSeenAt,
      demo: d.demo,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize),
  });
}

export async function listNotifications(req: Request<unknown, unknown, unknown, Record<string, any>>, res: Response) {
  const q = adminNotificationsQuerySchema.parse(req.query);
  const filter: Record<string, any> = {};
  if (q.type) filter.type = q.type;
  if (q.delivered !== undefined) filter.delivered = q.delivered === 'true';
  if (q.userId) filter.userId = q.userId;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ sentAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  res.json({
    items: items.map((n) => ({
      id: String(n._id),
      userId: String(n.userId),
      user: (n.userId as unknown as { firstName?: string; lastName?: string; email?: string }) ?? null,
      earthquakeId: n.earthquakeId ? String(n.earthquakeId) : null,
      type: n.type,
      title: n.title,
      body: n.body,
      level: n.level,
      sentAt: n.sentAt,
      delivered: n.delivered,
      error: n.error,
      provider: n.provider,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize),
  });
}

export async function listLogs(req: Request<unknown, unknown, unknown, Record<string, any>>, res: Response) {
  const q = adminLogsQuerySchema.parse(req.query);
  const filter: Record<string, any> = {};
  if (q.level) filter.level = q.level;
  if (q.category) filter.category = q.category;

  const [items, total] = await Promise.all([
    SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    SystemLog.countDocuments(filter),
  ]);
  res.json({
    items: items.map((l) => ({
      id: String(l._id),
      level: l.level,
      category: l.category,
      message: l.message,
      meta: l.meta,
      timestamp: l.timestamp,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize),
  });
}

export async function listSources(_req: Request, res: Response) {
  const config = await getAlertConfig(true);
  const statuses = await SourceStatus.find().lean();
  const registry = new ProviderRegistry({
    sgcUrl: env.sgcApiUrl,
    usgsUrl: env.usgsApiUrl,
    mockEnabled: env.mockEnabled,
    mockIntervalMinutes: env.mockIntervalMinutes,
  });
  res.json({
    items: registry.names().map((name) => {
      const provider = registry.get(name)!;
      const st = statuses.find((s) => s.source === name);
      return {
        source: name,
        label: provider.label,
        configured: provider.isConfigured(),
        enabled: config.sources[name]?.enabled ?? true,
        status: st?.status ?? (provider.isConfigured() ? 'down' : 'misconfigured'),
        lastCheckedAt: st?.lastCheckedAt ?? null,
        lastSuccessAt: st?.lastSuccessAt ?? null,
        lastError: st?.lastError ?? null,
        consecutiveFailures: st?.consecutiveFailures ?? 0,
        lastEventAt: st?.lastEventAt ?? null,
        eventsFound: st?.eventsFound ?? 0,
        processingTimeMs: st?.processingTimeMs ?? null,
      };
    }),
  });
}

export async function getConfig(_req: Request, res: Response) {
  res.json({ config: toPublicConfig(await getAlertConfig(true)) });
}

export async function putConfig(req: Request, res: Response) {
  const input = updateConfigSchema.parse(req.body);
  const config = await updateAlertConfig(input);
  await writeLog('info', 'admin', 'Configuración actualizada', { patch: input });
  res.json({ config: toPublicConfig(config) });
}

export async function sendPushTest(req: Request, res: Response) {
  const input = pushTestSchema.parse(req.body);
  if (!pushService.isConfigured()) {
    throw ApiError.serviceUnavailable('Las notificaciones push no están configuradas en el servidor');
  }
  let targets: mongoose.Types.ObjectId[];
  if (input.userId) {
    if (!mongoose.isValidObjectId(input.userId)) throw ApiError.badRequest('Id de usuario inválido');
    targets = [new mongoose.Types.ObjectId(input.userId)];
  } else {
    const subs = await (await import('../models/PushSubscriptionDoc')).PushSubscription.distinct('userId');
    targets = subs as mongoose.Types.ObjectId[];
  }
  let delivered = 0;
  let failed = 0;
  const detail: { userId: string; delivered: boolean; error?: string }[] = [];
  for (const uid of targets) {
    const result = await pushService.sendTest(uid, input.title, input.body);
    delivered += result.delivered;
    failed += result.failed;
    detail.push({ userId: String(uid), delivered: result.delivered > 0, error: result.failed ? 'falló' : undefined });
  }
  await writeLog('info', 'push', 'Push de prueba enviado por administrador', {
    targets: targets.length,
    delivered,
    failed,
  });
  res.json({ targets: targets.length, delivered, failed, detail });
}

export async function deleteEarthquake(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Id inválido');
  const doc = await Earthquake.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound('Evento no encontrado');
  await writeLog('info', 'admin', 'Evento sísmico eliminado', { id });
  res.status(204).send();
}
