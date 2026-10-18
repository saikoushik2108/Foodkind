import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PickupTask } from '../models/PickupTask.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';

const router = Router();

/* ── My pickups ───────────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Show pickups relevant to the user's role
    if (req.user.role === 'ADMIN') {
      // Admin sees all
    } else if (req.organization) {
      filter.$or = [
        { donor: req.organization._id },
        { recipient: req.organization._id },
        { assignedTo: req.user._id },
      ];
    } else {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      PickupTask.find(filter)
        .populate('donation', 'title category')
        .populate('donor', 'name address')
        .populate('recipient', 'name address')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      PickupTask.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Get single pickup ────────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donation')
      .populate('donor', 'name address location')
      .populate('recipient', 'name address location')
      .populate('assignedTo', 'name email phone')
      .populate('reservation');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Assign ───────────────────────────────────────────────────────────── */
router.post('/:id/assign', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.assignedTo = req.body.assignedTo;
    item.status = 'ASSIGNED';
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Confirm arrival ──────────────────────────────────────────────────── */
router.post('/:id/confirm-arrival', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'ARRIVED';
    item.arrivedAt = new Date();
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Verify pickup with handover code ─────────────────────────────────── */
router.post('/:id/verify-pickup', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (item.handoverCode && req.body.code !== item.handoverCode) {
      return res.status(422).json({ success: false, error: { message: 'Invalid handover code' } });
    }
    item.status = 'COLLECTED';
    item.collectedAt = new Date();
    await item.save();

    // Update donation status
    const donation = await Donation.findById(item.donation);
    if (donation) { donation.status = 'COLLECTED'; await donation.save(); }

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Confirm delivery ─────────────────────────────────────────────────── */
router.post('/:id/confirm-delivery', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'COMPLETED';
    item.deliveredAt = new Date();
    item.completedAt = new Date();
    item.notes = req.body.notes || item.notes;
    await item.save();

    // Update donation and reservation
    const donation = await Donation.findById(item.donation);
    if (donation) { donation.status = 'COMPLETED'; await donation.save(); }
    const reservation = await Reservation.findById(item.reservation);
    if (reservation) { reservation.status = 'COMPLETED'; await reservation.save(); }

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Report issue ─────────────────────────────────────────────────────── */
router.post('/:id/report-issue', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.issue = {
      type: req.body.issueType || 'OTHER',
      description: req.body.description || '',
      reportedAt: new Date(),
      reportedBy: req.user._id,
    };
    item.status = 'FAILED';
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

export default router;
