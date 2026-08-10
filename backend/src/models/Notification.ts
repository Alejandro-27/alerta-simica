import mongoose, { Schema, model } from 'mongoose';

export const notificationSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    earthquakeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Earthquake', default: null },
    type: {
      type: String,
      enum: ['EARTHQUAKE_DETECTED', 'EARTHQUAKE_ALERT', 'SYSTEM_NOTIFICATION', 'TEST_NOTIFICATION'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    delivered: { type: Boolean, default: false },
    error: { type: String, default: null },
    provider: { type: String, default: 'web-push' },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    level: { type: String, enum: ['NORMAL', 'WARNING', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
  },
  { timestamps: true },
);

// Deduplicación de alertas: nunca dos veces el mismo (usuario, evento, tipo).
notificationSchema.index(
  { userId: 1, earthquakeId: 1, type: 1 },
  { unique: true, partialFilterExpression: { earthquakeId: { $type: 'objectId' } } },
);
notificationSchema.index({ sentAt: -1 });
notificationSchema.index({ delivered: 1 });

export const Notification = model('Notification', notificationSchema);
