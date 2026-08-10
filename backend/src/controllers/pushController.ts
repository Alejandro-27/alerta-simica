import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middleware/auth';
import { subscribePushSchema } from '../validators/authValidators';
import { pushService } from '../services/pushService';
import { ApiError } from '../utils/errors';
import { env } from '../config/env';
import { PushSubscription } from '../models/PushSubscriptionDoc';

export async function getPublicKey(_req: import('express').Request, res: Response) {
  res.json({
    publicKey: env.vapidPublicKey,
    configured: pushService.isConfigured(),
  });
}

export async function subscribe(req: AuthRequest, res: Response) {
  if (!pushService.isConfigured()) {
    throw ApiError.serviceUnavailable('Las notificaciones push no están configuradas en el servidor');
  }
  const input = subscribePushSchema.parse(req.body);
  const sub = await pushService.subscribe(
    new mongoose.Types.ObjectId(req.user!.id),
    input.subscription,
    { device: input.device, browser: input.browser, platform: input.platform },
  );
  res.status(201).json({
    subscription: {
      endpoint: sub.endpoint,
      device: sub.device,
      browser: sub.browser,
      platform: sub.platform,
      active: sub.active,
      createdAt: sub.createdAt,
      lastUsedAt: sub.lastUsedAt,
    },
  });
}

export async function unsubscribe(req: AuthRequest, res: Response) {
  const endpoint = String(req.body?.endpoint ?? '');
  if (!endpoint) throw ApiError.badRequest('Falta el endpoint');
  await pushService.unsubscribe(new mongoose.Types.ObjectId(req.user!.id), endpoint);
  res.status(204).send();
}

export async function status(req: AuthRequest, res: Response) {
  const count = await PushSubscription.countDocuments({
    userId: new mongoose.Types.ObjectId(req.user!.id),
    active: true,
  });
  res.json({
    supported: true,
    configured: pushService.isConfigured(),
    subscribed: count > 0,
    subscriptionCount: count,
  });
}
