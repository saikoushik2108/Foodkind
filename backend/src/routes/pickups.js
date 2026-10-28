import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PickupTask } from '../models/PickupTask.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Incident } from '../models/Incident.js';
import { Organization } from '../models/Organization.js';

const router = Router();

export function serializePickupTask(task) {
  if (!task) return null;
  const obj = task.toObject ? task.toObject() : { ...task };
  obj.expectedQuantity = obj.quantity;
  obj.collectedQuantity = obj.collectedQuantity || (['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(obj.status) ? obj.quantity : 0);
  obj.deliveredQuantity = obj.deliveredQuantity || (['DELIVERED', 'COMPLETED'].includes(obj.status) ? (obj.collectedQuantity || obj.quantity) : 0);
  obj.unit = obj.donation?.unit || 'PORTIONS';
  obj.windowStart = obj.windowStart || obj.donation?.pickupWindowStart || obj.scheduledAt || obj.createdAt;
  obj.windowEnd = obj.windowEnd || obj.donation?.pickupWindowEnd || obj.scheduledAt || new Date(new Date(obj.windowStart).getTime() + 4 * 3600000);
  obj.pickupAddress = obj.donation?.pickupAddress || (obj.donor?.address?.line ? `${obj.donor.address.line}, ${obj.donor.address.city}` : 'Donor Premises');
  obj.deliveryAddress = obj.recipient?.address?.line ? `${obj.recipient.address.line}, ${obj.recipient.address.city}` : 'Recipient Kitchen / Shelter';
  
  if (obj.arrivedAt && obj.windowStart) {
    const diffMin = Math.round((new Date(obj.arrivedAt) - new Date(obj.windowStart)) / 60000);
    obj.delayMinutes = diffMin > 0 ? diffMin : 0;
  } else {
    obj.delayMinutes = 0;
  }

  const history = [];
  if (obj.createdAt) history.push({ event: 'ASSIGNED', at: obj.createdAt, note: `Task created (${obj.assignmentType})` });
  if (obj.arrivedAt) history.push({ event: 'ARRIVED', at: obj.arrivedAt, note: 'Collector arrived at donor premises' });
  if (obj.collectedAt) history.push({ event: 'COLLECTED', at: obj.collectedAt, note: `Handover verified (${obj.collectedQuantity} ${obj.unit})` });
  if (obj.deliveredAt) history.push({ event: 'DELIVERED', at: obj.deliveredAt, note: `Delivery reached recipient (${obj.deliveredQuantity} ${obj.unit})` });
  if (obj.completedAt) history.push({ event: 'COMPLETED', at: obj.completedAt, note: obj.notes || 'Redistribution confirmed' });
  if (obj.status === 'FAILED' && obj.issue?.reportedAt) {
    history.push({ event: 'FAILED', at: obj.issue.reportedAt, note: obj.issue.description || 'Problem escalated' });
  }
  obj.eventHistory = history;
  obj.meta = {
    codeActive: obj.status === 'ARRIVED',
    distanceType: 'straight-line',
  };
  return obj;
}

/* ── My pickups ───────────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    const orgId = req.organization?._id;
    const isVolunteer = req.user.membershipRole === 'VOLUNTEER' || req.organization?.type === 'PARTNER';

    if (req.user.role === 'ADMIN') {
      // Admin sees all
    } else if (isVolunteer) {
      filter.$or = [
        { assignedTo: req.user._id },
        { assignedPartner: orgId },
        { assignmentType: { $in: ['VOLUNTEER', 'PARTNER'] } },
      ];
    } else if (orgId) {
      filter.$or = [
        { donor: orgId },
        { recipient: orgId },
        { assignedTo: req.user._id },
        { assignedPartner: orgId },
      ];
    } else {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      PickupTask.find(filter)
        .populate('donation')
        .populate('donor', 'name address location contactEmail contactPhone')
        .populate('recipient', 'name address location contactEmail contactPhone')
        .populate('assignedTo', 'name email phone role')
        .populate('assignedPartner', 'name address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PickupTask.countDocuments(filter),
    ]);

    const serialized = items.map(serializePickupTask);

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

/* ── Get single pickup ────────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donation')
      .populate('donor', 'name address location contactEmail contactPhone')
      .populate('recipient', 'name address location contactEmail contactPhone')
      .populate('assignedTo', 'name email phone role')
      .populate('assignedPartner', 'name address')
      .populate('reservation');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Pickup task not found' } });
    res.json({ success: true, data: serializePickupTask(item) });
  } catch (err) { next(err); }
});

/* ── Assign ───────────────────────────────────────────────────────────── */
router.post('/:id/assign', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.assignedTo = req.body.assignedTo || req.user._id;
    item.status = 'ASSIGNED';
    await item.save();

    const populated = await PickupTask.findById(item._id)
      .populate('donation')
      .populate('donor')
      .populate('recipient')
      .populate('assignedTo');

    res.json({ success: true, data: serializePickupTask(populated) });
  } catch (err) { next(err); }
});

/* ── Confirm arrival ──────────────────────────────────────────────────── */
router.post('/:id/confirm-arrival', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donor')
      .populate('recipient')
      .populate('donation');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    if (!item.handoverCode) {
      item.handoverCode = String(Math.floor(100000 + Math.random() * 900000));
    }
    item.status = 'ARRIVED';
    item.arrivedAt = new Date();
    await item.save();

    // Create notification for donor with handover code
    if (item.donor) {
      const donorUser = await User.findOne({ organization: item.donor._id });
      if (donorUser) {
        await Notification.create({
          user: donorUser._id,
          organization: item.donor._id,
          type: 'HANDOVER_CODE',
          title: 'Collector arrived — Your Handover Code is ' + item.handoverCode,
          message: `The collector has arrived at your location for "${item.donation?.title}". Please provide the 6-digit code: ${item.handoverCode}`,
          data: { pickupId: item._id, handoverCode: item.handoverCode },
        });
      }
    }

    const populated = await PickupTask.findById(item._id)
      .populate('donation')
      .populate('donor')
      .populate('recipient')
      .populate('assignedTo');

    res.json({ success: true, data: serializePickupTask(populated) });
  } catch (err) { next(err); }
});

/* ── Verify pickup with handover code ─────────────────────────────────── */
router.post('/:id/verify-pickup', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donation')
      .populate('donor')
      .populate('recipient');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    const submittedCode = String(req.body.code || '').trim();
    if (item.handoverCode && submittedCode && item.handoverCode !== submittedCode) {
      return res.status(422).json({ success: false, error: { message: 'Invalid handover code. Please check with the donor.' } });
    }

    item.status = 'COLLECTED';
    item.collectedAt = new Date();
    item.collectedQuantity = item.quantity;
    await item.save();

    // Update donation status
    const donation = await Donation.findById(item.donation);
    if (donation) {
      donation.status = 'COLLECTED';
      await donation.save();
    }

    // Notify recipient that food is on the way
    if (item.recipient) {
      const recipientUser = await User.findOne({ organization: item.recipient._id });
      if (recipientUser) {
        await Notification.create({
          user: recipientUser._id,
          organization: item.recipient._id,
          type: 'FOOD_IN_TRANSIT',
          title: 'Food collected — On its way to you!',
          message: `${item.quantity} ${item.donation?.unit || 'portions'} of "${item.donation?.title}" was verified and collected from ${item.donor?.name}.`,
          data: { pickupId: item._id },
        });
      }
    }

    const populated = await PickupTask.findById(item._id)
      .populate('donation')
      .populate('donor')
      .populate('recipient')
      .populate('assignedTo');

    res.json({ success: true, data: serializePickupTask(populated) });
  } catch (err) { next(err); }
});

/* ── Confirm delivery ─────────────────────────────────────────────────── */
router.post('/:id/confirm-delivery', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donation')
      .populate('donor')
      .populate('recipient');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    const receivedQty = Number(req.body.receivedQuantity) || item.collectedQuantity || item.quantity;
    item.status = 'COMPLETED';
    item.deliveredAt = new Date();
    item.completedAt = new Date();
    item.deliveredQuantity = receivedQty;
    item.notes = req.body.note || item.notes;
    await item.save();

    // Update donation and reservation
    const donation = await Donation.findById(item.donation);
    if (donation) {
      donation.status = 'COMPLETED';
      donation.actualQuantity = receivedQty;
      await donation.save();
    }

    const reservation = await Reservation.findById(item.reservation);
    if (reservation) {
      reservation.status = 'COMPLETED';
      await reservation.save();
    }

    // Update impact counters on donor and recipient organizations
    const mealsEquivalent = donation?.impactEstimate?.mealsEquivalent || receivedQty;
    const co2SavedKg = donation?.impactEstimate?.co2SavedKg || Math.round(receivedQty * 1.9);

    if (item.donor) {
      await Organization.findByIdAndUpdate(item.donor._id, {
        $inc: {
          'impactMetrics.totalDonations': 1,
          'impactMetrics.totalPortions': receivedQty,
          'impactMetrics.mealsDistributed': mealsEquivalent,
          'impactMetrics.co2SavedKg': co2SavedKg,
        },
      });
    }

    if (item.recipient) {
      await Organization.findByIdAndUpdate(item.recipient._id, {
        $inc: {
          'impactMetrics.totalPortions': receivedQty,
          'impactMetrics.mealsDistributed': mealsEquivalent,
          'impactMetrics.co2SavedKg': co2SavedKg,
        },
      });
    }

    // Notify donor and collector
    if (item.donor) {
      const donorUser = await User.findOne({ organization: item.donor._id });
      if (donorUser) {
        await Notification.create({
          user: donorUser._id,
          organization: item.donor._id,
          type: 'DELIVERY_CONFIRMED',
          title: 'Delivery confirmed!',
          message: `${receivedQty} portions of "${item.donation?.title}" was safely received by ${item.recipient?.name}.`,
          data: { pickupId: item._id },
        });
      }
    }

    const populated = await PickupTask.findById(item._id)
      .populate('donation')
      .populate('donor')
      .populate('recipient')
      .populate('assignedTo');

    res.json({ success: true, data: serializePickupTask(populated) });
  } catch (err) { next(err); }
});

/* ── Report issue ─────────────────────────────────────────────────────── */
router.post('/:id/report-issue', requireAuth, async (req, res, next) => {
  try {
    const item = await PickupTask.findById(req.params.id)
      .populate('donation')
      .populate('donor')
      .populate('recipient');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    const reason = req.body.reason || req.body.description || 'Problem during pickup/delivery';
    const issueType = req.body.type || req.body.issueType || 'OTHER';

    item.issue = {
      type: issueType,
      description: reason,
      reportedAt: new Date(),
      reportedBy: req.user._id,
    };
    item.failure = {
      reason,
      at: new Date(),
    };
    item.status = 'FAILED';
    await item.save();

    // Create incident
    await Incident.create({
      title: `${issueType.replace(/_/g, ' ')}: ${reason.slice(0, 40)}`,
      description: reason,
      type: ['FOOD_SAFETY','QUALITY_MISMATCH','QUANTITY_MISMATCH','MISSED_PICKUP','MISCONDUCT'].includes(issueType) ? issueType : 'OTHER',
      severity: issueType === 'FOOD_SAFETY' ? 'CRITICAL' : 'HIGH',
      donation: item.donation?._id,
      pickup: item._id,
      reportedBy: req.user._id,
      organization: req.organization?._id,
      status: 'OPEN',
    });

    const populated = await PickupTask.findById(item._id)
      .populate('donation')
      .populate('donor')
      .populate('recipient')
      .populate('assignedTo');

    res.json({ success: true, data: serializePickupTask(populated) });
  } catch (err) { next(err); }
});

export default router;
