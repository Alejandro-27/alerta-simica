import mongoose, { Schema, model } from 'mongoose';

/** Estado de cada fuente sísmica (observabilidad). */
export const sourceStatusSchema = new Schema(
  {
    source: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['up', 'down', 'disabled', 'misconfigured'],
      default: 'disabled',
    },
    lastCheckedAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    lastEventAt: { type: Date, default: null },
    eventsFound: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: null },
  },
  { timestamps: true },
);

export const SourceStatus = model('SourceStatus', sourceStatusSchema);

export async function updateSourceStatus(source: string, patch: Record<string, unknown>) {
  try {
    await SourceStatus.findOneAndUpdate({ source }, { $set: patch }, { upsert: true });
  } catch (err) {
    console.error(`Fallo al actualizar estado de fuente ${source}`, err);
  }
}
