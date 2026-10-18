import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Reservation } from '../models/Reservation.js';
import { Donation } from '../models/Donation.js';
import { PickupTask } from '../models/PickupTask.js';

const router = Router();

/* ── My reservations ──────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { recipient: req.organization?._id };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Reservation.find(filter).populate('donation', 'title category quantity unit bestBefore donor status').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Reservation.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Get single reservation ───────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id).populate('donation').populate('recipient', 'name');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Accept ───────────────────────────────────────────────────────────── */
router.post('/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (item.status !== 'RESERVED') return res.status(422).json({ success: false, error: { message: 'Can only accept pending reservations' } });
    item.status = 'ACCEPTED';
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Decline ──────────────────────────────────────────────────────────── */
router.post('/:id/decline', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'DECLINED';
    item.declineReason = req.body.reason || '';
    await item.save();
    // Release quantity back to donation
    const donation = await Donation.findById(item.donation);
    if (donation) {
      donation.remainingQuantity += item.quantity;
      if (donation.status === 'RESERVED') donation.status = 'PARTIALLY_RESERVED';
      else if (donation.remainingQuantity >= donation.quantity) donation.status = 'AVAILABLE';
      await donation.save();
    }
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Cancel ────────────────────────────────────────────────────────────── */
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'CANCELLED';
    item.cancelReason = req.body.reason || '';
    await item.save();
    const donation = await Donation.findById(item.donation);
    if (donation) {
      donation.remainingQuantity += item.quantity;
      if (donation.status === 'RESERVED') donation.status = 'PARTIALLY_RESERVED';
      else if (donation.remainingQuantity >= donation.quantity) donation.status = 'AVAILABLE';
      await donation.save();
    }
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Create pickup from reservation ───────────────────────────────────── */
router.post('/:id/pickup', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (item.status !== 'ACCEPTED') return res.status(422).json({ success: false, error: { message: 'Reservation must be accepted first' } });

    const donation = await Donation.findById(item.donation);

    // Generate 6-digit handover code
    const handoverCode = String(Math.floor(100000 + Math.random() * 900000));

    const pickup = await PickupTask.create({
      reservation: item._id,
      donation: item.donation,
      donor: donation?.donor,
      recipient: item.recipient,
      assignedTo: req.body.assignedTo || req.user._id,
      assignmentType: req.body.assignmentType || 'RECIPIENT_SELF_PICKUP',
      quantity: item.quantity,
      handoverCode,
      scheduledAt: req.body.scheduledAt || new Date(),
    });

    if (donation) {
      donation.status = 'PICKUP_ASSIGNED';
      await donation.save();
    }

    res.status(201).json({ success: true, data: pickup });
  } catch (err) { next(err); }
});

export default router;
