import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Reservation } from '../models/Reservation.js';
import { Donation } from '../models/Donation.js';
import { PickupTask } from '../models/PickupTask.js';

const router = Router();

function serializeReservation(r) {
  if (!r) return null;
  const obj = r.toObject ? r.toObject() : { ...r };
  obj.requestedQuantity = obj.quantity;
  obj.approvedQuantity = ['ACCEPTED', 'COLLECTED', 'COMPLETED'].includes(obj.status) ? obj.quantity : null;
  obj.deliveredQuantity = ['COMPLETED'].includes(obj.status) ? obj.quantity : null;
  if (obj.donation && typeof obj.donation === 'object') {
    obj.donation.collectionAddress = obj.donation.pickupAddress || '';
    obj.donation.foodCategory = obj.donation.category;
  }
  return obj;
}

/* ── My reservations ──────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, donationId, page = 1, limit = 20 } = req.query;
    const orgId = req.organization?._id;
    const orgType = req.organization?.type;
    const isAdmin = req.user.role === 'ADMIN';

    let filter = {};

    if (donationId) {
      filter.donation = donationId;
    } else if (isAdmin) {
      // Admin sees all
    } else if (orgType === 'DONOR') {
      // Donor sees reservations on their donations
      const myDonationIds = await Donation.find({ donor: orgId }).distinct('_id');
      filter.donation = { $in: myDonationIds };
    } else if (orgId) {
      filter.recipient = orgId;
    } else {
      filter.reservedBy = req.user._id;
    }

    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Reservation.find(filter)
        .populate('donation')
        .populate('recipient', 'name address location contactPhone contactEmail')
        .populate('reservedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Reservation.countDocuments(filter),
    ]);

    const serialized = items.map(serializeReservation);

    res.json({
      success: true,
      data: serialized,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { next(err); }
});

/* ── Get single reservation ───────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id)
      .populate('donation')
      .populate('recipient', 'name address location contactPhone contactEmail')
      .populate('reservedBy', 'name email');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: serializeReservation(item) });
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
    res.json({ success: true, data: serializeReservation(item) });
  } catch (err) { next(err); }
});

/* ── Decline ──────────────────────────────────────────────────── */
router.post('/:id/decline', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'DECLINED';
    item.declineReason = req.body.reason || 'Declined by donor';
    await item.save();

    // Release quantity back to donation
    const donation = await Donation.findById(item.donation);
    if (donation) {
      donation.remainingQuantity = Math.min(donation.quantity, donation.remainingQuantity + item.quantity);
      if (donation.remainingQuantity >= donation.quantity) donation.status = 'AVAILABLE';
      else donation.status = 'PARTIALLY_RESERVED';
      await donation.save();
    }
    res.json({ success: true, data: serializeReservation(item) });
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
      donation.remainingQuantity = Math.min(donation.quantity, donation.remainingQuantity + item.quantity);
      if (donation.remainingQuantity >= donation.quantity) donation.status = 'AVAILABLE';
      else donation.status = 'PARTIALLY_RESERVED';
      await donation.save();
    }
    res.json({ success: true, data: serializeReservation(item) });
  } catch (err) { next(err); }
});

/* ── Create pickup from reservation ───────────────────────────────────── */
router.post('/:id/pickup', requireAuth, async (req, res, next) => {
  try {
    const item = await Reservation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (!['ACCEPTED', 'RESERVED'].includes(item.status)) {
      return res.status(422).json({ success: false, error: { message: 'Reservation must be accepted or active' } });
    }

    const donation = await Donation.findById(item.donation).populate('donor');

    // Generate 6-digit handover code
    const handoverCode = String(Math.floor(100000 + Math.random() * 900000));

    const pickup = await PickupTask.create({
      reservation: item._id,
      donation: item.donation,
      donor: donation?.donor?._id || donation?.donor,
      recipient: item.recipient,
      assignedTo: req.body.assignedTo || (req.body.assignmentType === 'RECIPIENT_SELF_PICKUP' ? req.user._id : null),
      assignmentType: req.body.assignmentType || 'RECIPIENT_SELF_PICKUP',
      status: req.body.assignedTo || req.body.assignmentType === 'RECIPIENT_SELF_PICKUP' ? 'ASSIGNED' : 'PENDING_ACCEPTANCE',
      quantity: item.quantity,
      expectedQuantity: item.quantity,
      handoverCode,
      scheduledAt: req.body.scheduledAt || donation?.pickupWindowStart || new Date(),
      windowStart: donation?.pickupWindowStart || new Date(),
      windowEnd: donation?.pickupWindowEnd || new Date(Date.now() + 4 * 3600000),
    });

    if (donation) {
      donation.status = 'PICKUP_ASSIGNED';
      await donation.save();
    }

    item.status = 'ACCEPTED';
    await item.save();

    res.status(201).json({ success: true, data: pickup });
  } catch (err) { next(err); }
});

export default router;
