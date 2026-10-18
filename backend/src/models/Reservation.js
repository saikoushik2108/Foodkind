import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  donation:    { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
  recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  reservedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity:    { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['RESERVED','ACCEPTED','DECLINED','CANCELLED','EXPIRED','COLLECTED','COMPLETED'],
    default: 'RESERVED',
  },
  declineReason: { type: String, default: '' },
  cancelReason:  { type: String, default: '' },
  notes:         { type: String, default: '' },
  expiresAt:     { type: Date },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

reservationSchema.index({ donation: 1, status: 1 });
reservationSchema.index({ recipient: 1, status: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
