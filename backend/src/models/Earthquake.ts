import mongoose, { Schema, model } from 'mongoose';

export const earthquakeSchema = new Schema(
  {
    externalId: { type: String, required: true },
    source: { type: String, required: true, index: true },
    magnitude: { type: Number, required: true, min: -2, max: 12, index: true },
    magnitudeType: { type: String, default: '' },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    depth: { type: Number, required: true, min: 0 },
    place: { type: String, required: true, trim: true, maxlength: 300 },
    eventTime: { type: Date, required: true, index: true },
    updatedAt: { type: Date, required: true },
    tsunami: { type: Boolean, default: false },
    felt: { type: Number, default: null },
    alertLevel: { type: String, default: null },
    status: { type: String, enum: ['automatic', 'reviewed', 'deleted', 'preliminary', 'unprocessed'], default: 'automatic' },
    sourceUrl: { type: String, default: null },
    rawData: { type: mongoose.Schema.Types.Mixed, default: null },
    firstDetectedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    demo: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

// Deduplicación: un evento por (fuente, id externo).
earthquakeSchema.index({ externalId: 1, source: 1 }, { unique: true });
// Consultas geográficas (radio de alerta).
earthquakeSchema.index({ latitude: 1, longitude: 1 });
earthquakeSchema.index({ eventTime: -1, magnitude: -1 });

export const Earthquake = model('Earthquake', earthquakeSchema);

export interface EarthquakeDoc {
  externalId: string;
  source: string;
  magnitude: number;
  magnitudeType: string;
  latitude: number;
  longitude: number;
  depth: number;
  place: string;
  eventTime: Date;
  updatedAt: Date;
  tsunami: boolean;
  felt: number | null;
  alertLevel: string | null;
  status: string;
  sourceUrl: string | null;
  rawData: unknown;
  firstDetectedAt: Date;
  lastSeenAt: Date;
  demo: boolean;
  createdAt: Date;
  updatedAtDb: Date;
  _id: mongoose.Types.ObjectId;
}
