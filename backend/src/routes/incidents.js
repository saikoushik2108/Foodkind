import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Incident } from '../models/Incident.js';
import { Donation } from '../models/Donation.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

/* ── Create incident ─────────────────────────────────────────────────── */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { donationId, pickupId, type, severity, description } = req.body;
    if (!description || !type) {
      return res.status(400).json({ success: false, error: { message: 'Type and description are required' } });
    }

    const incident = await Incident.create({
      donation: donationId || null,
      pickup: pickupId || null,
      reportedBy: req.user._id,
      organization: req.organization?._id || null,
      type,
      severity: severity || 'MEDIUM',
      description,
      status: 'OPEN',
    });

    if (donationId) {
      await Donation.findByIdAndUpdate(donationId, { status: 'SAFETY_HOLD' });
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'INCIDENT_REPORTED',
      resource: 'Incident',
      resourceId: incident._id,
      details: { type, severity, donationId },
    });

    res.status(201).json({ success: true, data: incident });
  } catch (err) { next(err); }
});

/* ── List mine ───────────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const filter = {
      $or: [
        { reportedBy: req.user._id },
        ...(req.organization ? [{ organization: req.organization._id }] : []),
      ],
    };
    const incidents = await Incident.find(filter)
      .populate('donation', 'title status quantity')
      .populate('pickup', 'status scheduledAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: incidents });
  } catch (err) { next(err); }
});

/* ── Trace donation incidents ────────────────────────────────────────── */
router.get('/trace', requireAuth, async (req, res, next) => {
  try {
    const { donationId } = req.query;
    if (!donationId) {
      return res.status(400).json({ success: false, error: { message: 'donationId is required' } });
    }

    const incidents = await Incident.find({ donation: donationId })
      .populate('reportedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { donationId, incidents } });
  } catch (err) { next(err); }
});

export default router;
