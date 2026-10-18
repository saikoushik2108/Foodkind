import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [lng, lat]
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 160 },
  type:        { type: String, enum: ['DONOR', 'RECIPIENT', 'PARTNER'], required: true },
  description: { type: String, default: '', maxlength: 2000 },
  address: {
    line:       { type: String, default: '' },
    city:       { type: String, default: '' },
    region:     { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country:    { type: String, default: 'India' },
  },
  location: { type: pointSchema, index: '2dsphere' },
  serviceAreaKm:      { type: Number, default: 10 },
  dailyPeopleServed:  { type: Number, default: 0 },
  maxStoragePortions: { type: Number, default: 0 },
  canStoreChilled:    { type: Boolean, default: true },
  verificationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], default: 'PENDING' },
  verificationNote:   { type: String, default: '' },
  documents: [{ url: String, label: String, uploadedAt: { type: Date, default: Date.now } }],
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  impactMetrics: {
    totalDonations:    { type: Number, default: 0 },
    totalPortions:     { type: Number, default: 0 },
    totalKg:           { type: Number, default: 0 },
    mealsDistributed:  { type: Number, default: 0 },
    co2SavedKg:        { type: Number, default: 0 },
  },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

export const Organization = mongoose.model('Organization', organizationSchema);
