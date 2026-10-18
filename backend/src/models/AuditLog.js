import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true },
  resource:   { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
  ip:         { type: String, default: '' },
  isSeed:     { type: Boolean, default: false },
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
