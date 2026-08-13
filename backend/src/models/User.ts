import mongoose, { Schema, InferSchemaType, model } from 'mongoose';

const alertSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    minimumMagnitude: { type: Number, default: 4.5, min: 0, max: 10 },
    alertRadiusKm: { type: Number, default: 100, min: 1, max: 1000 },
    nearbyAlerts: { type: Boolean, default: true },
    nationalAlerts: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
  },
  { _id: false },
);

export const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30, default: null },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    active: { type: Boolean, default: true },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      accuracy: { type: Number, min: 0, default: null },
      updatedAt: { type: Date, default: null },
    },
    locationManual: {
      country: { type: String, default: 'Colombia' },
      department: { type: String, default: '' },
      municipality: { type: String, default: '' },
      latitude: { type: Number, min: -90, max: 90, default: null },
      longitude: { type: Number, min: -180, max: 180, default: null },
    },
    alertSettings: { type: alertSettingsSchema, default: () => ({}) },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = model('User', userSchema);
