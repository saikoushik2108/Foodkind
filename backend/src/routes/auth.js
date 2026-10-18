import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, signTokenCookie } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';

const router = Router();

/* ── Register ─────────────────────────────────────────────────────────── */
const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(25).optional().default(''),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(1),
  organizationName: z.string().min(2).max(160),
  organizationType: z.enum(['DONOR', 'RECIPIENT', 'PARTNER']),
  organizationDescription: z.string().max(2000).optional().default(''),
  addressLine: z.string().min(4).max(300),
  city: z.string().min(2).max(120),
  region: z.string().max(120).optional().default(''),
  postalCode: z.string().max(20).optional().default(''),
  country: z.string().max(80).optional().default('India'),
  location: z.object({
    type: z.literal('Point').optional().default('Point'),
    coordinates: z.array(z.number()).length(2),
  }),
  serviceAreaKm: z.number().min(0).max(200).optional().default(10),
  dailyPeopleServed: z.number().min(0).optional().default(0),
  maxStoragePortions: z.number().min(0).optional().default(0),
  canStoreChilled: z.boolean().optional().default(true),
  acceptedPolicies: z.literal(true, { errorMap: () => ({ message: 'You must accept the platform policies' }) }),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const d = req.validated;

    // Check duplicate email
    if (await User.findOne({ email: d.email })) {
      return res.status(422).json({ success: false, error: { message: 'An account with this email already exists', details: [{ field: 'email', message: 'This email is already registered' }] } });
    }

    // Create organization
    const org = await Organization.create({
      name: d.organizationName,
      type: d.organizationType,
      description: d.organizationDescription,
      address: { line: d.addressLine, city: d.city, region: d.region, postalCode: d.postalCode, country: d.country },
      location: d.location,
      serviceAreaKm: d.serviceAreaKm,
      dailyPeopleServed: d.dailyPeopleServed,
      maxStoragePortions: d.maxStoragePortions,
      canStoreChilled: d.canStoreChilled,
      contactEmail: d.email,
    });

    // Create user
    const user = await User.create({
      name: d.name,
      email: d.email,
      phone: d.phone,
      password: d.password,
      organization: org._id,
      membershipRole: 'OWNER',
      acceptedPolicies: true,
    });

    signTokenCookie(res, user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toSafe(),
        organization: org,
      },
    });
  } catch (err) { next(err); }
});

/* ── Login ────────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: { message: 'Your account has been suspended' } });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const organization = user.organization ? await Organization.findById(user.organization) : null;

    signTokenCookie(res, user);

    res.json({ success: true, data: { user: user.toSafe(), organization } });
  } catch (err) { next(err); }
});

/* ── Me ───────────────────────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafe(), organization: req.organization } });
});

/* ── Logout ───────────────────────────────────────────────────────────── */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true, data: { message: 'Logged out' } });
});

/* ── Forgot Password (stub) ──────────────────────────────────────────── */
router.post('/forgot-password', async (req, res) => {
  // In production, send an email with a reset link. For dev, just return success.
  res.json({ success: true, data: { message: 'If an account exists, a password reset email has been sent.' } });
});

/* ── Reset Password (stub) ───────────────────────────────────────────── */
router.post('/reset-password', async (req, res) => {
  res.json({ success: true, data: { message: 'Password reset (stub)' } });
});

/* ── Change Password ─────────────────────────────────────────────────── */
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(422).json({ success: false, error: { message: 'Current password is incorrect' } });
    }
    user.password = newPassword;
    await user.save();
    signTokenCookie(res, user);
    res.json({ success: true, data: { message: 'Password changed' } });
  } catch (err) { next(err); }
});

export default router;
