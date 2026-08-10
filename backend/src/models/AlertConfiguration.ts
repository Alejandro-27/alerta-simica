import mongoose, { Schema, model } from 'mongoose';

/** Configuración global del motor de alertas (documento singleton). */
export const alertConfigurationSchema = new Schema(
  {
    key: { type: String, default: 'global', unique: true },
    minimumMagnitude: { type: Number, default: 4.5, min: 0, max: 10 },
    maximumDepth: { type: Number, default: 200, min: 0, max: 1000 },
    alertRadiusKm: { type: Number, default: 100, min: 1, max: 2000 },
    highMagnitudeThreshold: { type: Number, default: 5.5, min: 0, max: 10 },
    enabled: { type: Boolean, default: true },
    country: { type: String, default: 'Colombia' },
    regions: { type: [String], default: [] },
    cities: { type: [String], default: [] },
    sources: {
      type: Map,
      of: new Schema({ enabled: { type: Boolean, default: true } }, { _id: false }),
      default: {},
    },
    pollIntervalSeconds: { type: Number, default: 30, min: 10, max: 3600 },
  },
  { timestamps: true },
);

export const AlertConfiguration = model('AlertConfiguration', alertConfigurationSchema);
