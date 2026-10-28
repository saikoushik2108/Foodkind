import mongoose from 'mongoose';

const pickupTaskSchema = new mongoose.Schema({
  reservation:   { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
  donation:      { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
  donor:         { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  recipient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  assignmentType: { type: String, enum: ['VOLUNTEER','PARTNER','RECIPIENT_SELF_PICKUP'], default: 'RECIPIENT_SELF_PICKUP' },
  status: {
    type: String,
    enum: ['ASSIGNED','ARRIVED','COLLECTED','DELIVERED','COMPLETED','FAILED','CANCELLED'],
    default: 'ASSIGNED',
  },
  handoverCode:  { type: String, default: '' },
  quantity:      { type: Number, required: true },
  collectedQuantity: { type: Number, default: 0 },
  deliveredQuantity: { type: Number, default: 0 },
  scheduledAt:   { type: Date },
  windowStart:   { type: Date },
  windowEnd:     { type: Date },
  arrivedAt:     { type: Date },
  collectedAt:   { type: Date },
  deliveredAt:   { type: Date },
  completedAt:   { type: Date },
  failure: {
    reason:      { type: String, default: '' },
    at:          { type: Date },
  },
  issue: {
    type:        { type: String, default: '' },
    description: { type: String, default: '' },
    reportedAt:  { type: Date },
    reportedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  notes: { type: String, default: '' },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

pickupTaskSchema.index({ donation: 1 });
pickupTaskSchema.index({ assignedTo: 1, status: 1 });

export const PickupTask = mongoose.model('PickupTask', pickupTaskSchema);
