import { Router } from 'express';
import { requireAuth, requireOrgType } from '../middleware/auth.js';
import { Organization } from '../models/Organization.js';
import { Donation } from '../models/Donation.js';

const router = Router();

/* ── My organization ──────────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  if (!req.organization) return res.status(404).json({ success: false, error: { message: 'No organization linked' } });
  res.json({ success: true, data: req.organization });
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.organization) return res.status(404).json({ success: false, error: { message: 'No organization linked' } });
    const allowed = ['name', 'description', 'address', 'location', 'serviceAreaKm', 'dailyPeopleServed', 'maxStoragePortions', 'canStoreChilled', 'contactEmail', 'contactPhone'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const org = await Organization.findByIdAndUpdate(req.organization._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

/* ── Resubmit for verification ────────────────────────────────────────── */
router.post('/resubmit', requireAuth, async (req, res, next) => {
  try {
    if (!req.organization) return res.status(404).json({ success: false, error: { message: 'No organization' } });
    if (req.organization.verificationStatus !== 'REJECTED') {
      return res.status(422).json({ success: false, error: { message: 'Can only resubmit after rejection' } });
    }
    req.organization.verificationStatus = 'PENDING';
    await req.organization.save();
    res.json({ success: true, data: req.organization });
  } catch (err) { next(err); }
});

/* ── List organizations ───────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { type, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.verificationStatus = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Organization.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Organization.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Get single org ───────────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, error: { message: 'Organization not found' } });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

/* ── Org donations ────────────────────────────────────────────────────── */
router.get('/:id/donations', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { donor: req.params.id };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Document upload (stub) ───────────────────────────────────────────── */
router.post('/documents', requireAuth, async (req, res) => {
  res.json({ success: true, data: { url: '/uploads/placeholder.pdf', label: 'document' } });
});

export default router;
