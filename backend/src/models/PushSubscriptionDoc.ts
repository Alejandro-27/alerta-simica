import mongoose, { Schema, model } from 'mongoose';

export const pushSubscriptionDocSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    device: { type: String, default: null },
    browser: { type: String, default: null },
    platform: { type: String, default: null },
    active: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: Date.now },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export interface PushSubscriptionDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  device: string | null;
  browser: string | null;
  platform: string | null;
  active: boolean;
  lastUsedAt: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const PushSubscription = model('PushSubscription', pushSubscriptionDocSchema);
