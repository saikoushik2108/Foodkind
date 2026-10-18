import mongoose from 'mongoose';

const demandRequestSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true, maxlength: 200 },
  description:  { type: String, default: '' },
  category:     { type: String, enum: ['PREPARED_MEAL','BAKED_GOODS','FRUIT_VEGETABLE','DAIRY','GRAINS_LEGUMES','PACKAGED','BEVERAGES','OTHER'], default: 'PREPARED_MEAL' },
  dietaryClassification: { type: String, enum: ['VEG','NON_VEG','VEGAN','JAIN','EGGETARIAN','UNSPECIFIED'], default: 'UNSPECIFIED' },
  quantityNeeded: { type: Number, required: true, min: 1 },
  quantityFulfilled: { type: Number, default: 0 },
  unit: { type: String, enum: ['PORTIONS','KILOGRAMS'], default: 'PORTIONS' },
  neededBy: { type: Date, required: true },
  mealPeriod: { type: String, enum: ['BREAKFAST','LUNCH','DINNER','SNACK','EVENT'], default: 'LUNCH' },
  status: {
    type: String,
    enum: ['OPEN','PARTIALLY_FULFILLED','FULFILLED','EXPIRED','CANCELLED'],
    default: 'OPEN',
  },
  notes: { type: String, default: '' },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

export const DemandRequest = mongoose.model('DemandRequest', demandRequestSchema);
