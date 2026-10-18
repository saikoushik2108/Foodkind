import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true },
}, { _id: false });

const donationSchema = new mongoose.Schema({
  donor:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true, maxlength: 200 },
  description:  { type: String, default: '', maxlength: 3000 },
  category:     { type: String, enum: ['PREPARED_MEAL','BAKED_GOODS','FRUIT_VEGETABLE','DAIRY','GRAINS_LEGUMES','PACKAGED','BEVERAGES','OTHER'], required: true },
  dietaryClassification: { type: String, enum: ['VEG','NON_VEG','VEGAN','JAIN','EGGETARIAN','UNSPECIFIED'], default: 'UNSPECIFIED' },
  allergens:    [{ type: String }],
  quantity:     { type: Number, required: true, min: 1 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  actualQuantity: { type: Number, default: null },
  unit:         { type: String, enum: ['PORTIONS', 'KILOGRAMS'], default: 'PORTIONS' },
  packagingType: { type: String, enum: ['SEALED_PACKAGING','OPEN_TRAYS','BULK_CONTAINERS','DISPOSABLE_BOXES','REUSABLE_CONTAINERS','OTHER'], default: 'SEALED_PACKAGING' },
  storageRequirement: { type: String, enum: ['AMBIENT','CHILLED','FROZEN','HOT_HOLDING'], default: 'AMBIENT' },
  pickupArrangement: { type: String, enum: ['PARTNER_PICKUP','RECIPIENT_SELF_PICKUP','BOTH'], default: 'BOTH' },
  mealPeriod:   { type: String, enum: ['BREAKFAST','LUNCH','DINNER','SNACK','EVENT'], default: 'LUNCH' },
  preparedAt:   { type: Date, default: Date.now },
  bestBefore:   { type: Date, required: true },
  pickupWindowStart: { type: Date },
  pickupWindowEnd:   { type: Date },
  pickupLocation:    { type: pointSchema },
  pickupAddress:     { type: String, default: '' },
  images:       [{ type: String }],
  safetyDeclaration: {
    properlyStored: { type: Boolean, default: true },
    freshlyPrepared: { type: Boolean, default: true },
    noContamination: { type: Boolean, default: true },
    declaredAt: { type: Date, default: Date.now },
  },
  status: {
    type: String,
    enum: ['DRAFT','AVAILABLE','PARTIALLY_RESERVED','RESERVED','PICKUP_ASSIGNED','COLLECTED','DELIVERED','COMPLETED','EXPIRED','CANCELLED','SAFETY_HOLD','DISPUTED'],
    default: 'DRAFT',
  },
  cancelReason: { type: String, default: '' },
  impactEstimate: {
    mealsEquivalent: { type: Number, default: 0 },
    co2SavedKg:      { type: Number, default: 0 },
    wastePreventedKg: { type: Number, default: 0 },
  },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

donationSchema.index({ donor: 1, status: 1 });
donationSchema.index({ status: 1, bestBefore: 1 });
donationSchema.index({ pickupLocation: '2dsphere' });

export const Donation = mongoose.model('Donation', donationSchema);
