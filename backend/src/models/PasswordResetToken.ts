import mongoose, { Schema, model } from 'mongoose';

/** Token de restablecimiento de contraseña (único uso). */
export const passwordResetTokenSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PasswordResetToken = model('PasswordResetToken', passwordResetTokenSchema);
