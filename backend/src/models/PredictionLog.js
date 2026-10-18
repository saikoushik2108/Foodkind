import mongoose from 'mongoose';

const predictionLogSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category:     { type: String, required: true },
  mealPeriod:   { type: String, default: 'LUNCH' },
  predictedDate: { type: Date, required: true },
  predictedQuantity: { type: Number, required: true },
  confidenceLow:  { type: Number, default: 0 },
  confidenceHigh: { type: Number, default: 0 },
  actualQuantity: { type: Number, default: null },
  unit: { type: String, enum: ['PORTIONS','KILOGRAMS'], default: 'PORTIONS' },
  method: { type: String, default: 'MANUAL' },
  notes: { type: String, default: '' },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

export const PredictionLog = mongoose.model('PredictionLog', predictionLogSchema);
