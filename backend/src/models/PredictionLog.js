import mongoose from 'mongoose';

const predictionLogSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category:     { type: String, default: 'PREPARED_MEAL' },
  mealPeriod:   { type: String, default: 'LUNCH' },
  targetDate:   { type: Date },
  predictedDate: { type: Date, default: Date.now },
  expectedCovers: { type: Number, default: 0 },
  predictedQuantity: { type: Number, required: true },
  lowerBound:    { type: Number, default: null },
  upperBound:    { type: Number, default: null },
  confidenceLow:  { type: Number, default: 0 },
  confidenceHigh: { type: Number, default: 0 },
  actualQuantity: { type: Number, default: null },
  absoluteError:  { type: Number, default: null },
  insufficientData: { type: Boolean, default: false },
  explanation:   { type: String, default: '' },
  features:      { type: mongoose.Schema.Types.Mixed, default: {} },
  unit: { type: String, enum: ['PORTIONS','KILOGRAMS'], default: 'PORTIONS' },
  method: { type: String, default: 'Weighted Moving Average' },
  modelVersion: { type: String, default: 'v1.4 (Surplus Forecast Engine)' },
  notes: { type: String, default: '' },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

export const PredictionLog = mongoose.model('PredictionLog', predictionLogSchema);
