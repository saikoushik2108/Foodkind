import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 120 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, default: '', trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role:     { type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
  status:   { type: String, enum: ['ACTIVE', 'SUSPENDED', 'BANNED'], default: 'ACTIVE' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  membershipRole: { type: String, enum: ['OWNER','MANAGER','STAFF','VOLUNTEER'], default: 'OWNER' },
  acceptedPolicies: { type: Boolean, default: false },
  lastLoginAt: { type: Date, default: null },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafe = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
