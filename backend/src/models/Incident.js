import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  donation:     { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  pickup:       { type: mongoose.Schema.Types.ObjectId, ref: 'PickupTask' },
  reportedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  type:         { type: String, enum: ['FOOD_SAFETY','QUALITY_MISMATCH','QUANTITY_MISMATCH','MISSED_PICKUP','MISCONDUCT','OTHER'], required: true },
  severity:     { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], default: 'MEDIUM' },
  title:        { type: String, default: '' },
  description:  { type: String, required: true },
  safetyHoldApplied: { type: Boolean, default: false },
  status:       { type: String, enum: ['OPEN','IN_REVIEW','INVESTIGATING','RESOLVED','DISMISSED'], default: 'OPEN' },
  resolution:   { type: String, default: '' },
  resolvedAt:   { type: Date },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isSeed:       { type: Boolean, default: false },
}, { timestamps: true });

export const Incident = mongoose.model('Incident', incidentSchema);
