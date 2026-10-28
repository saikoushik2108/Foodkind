import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Donation } from '../models/Donation.js';
import { PickupTask } from '../models/PickupTask.js';
import { Incident } from '../models/Incident.js';
import { AuditLog } from '../models/AuditLog.js';
import { Reservation } from '../models/Reservation.js';
import { serializeDonation } from './donations.js';
import { serializePickupTask } from './pickups.js';

const router = Router();

// Ensure all routes in this file require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

/* ── Platform Overview ───────────────────────────────────────────────── */
router.get('/overview', async (_req, res, next) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      organizations,
      pendingVerifications,
      totalUsers,
      donations,
      activeDonations,
      reservedDonations,
      openIncidents,
      incidents,
      pickupsInProgress,
      expiringListings,
      completedRedistributions,
      completedDonations,
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ verificationStatus: 'PENDING' }),
      User.countDocuments(),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'AVAILABLE' }),
      Donation.countDocuments({ status: { $in: ['PARTIALLY_RESERVED', 'RESERVED'] } }),
      Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } }),
      Incident.countDocuments(),
      PickupTask.countDocuments({ status: { $in: ['ASSIGNED', 'ARRIVED', 'COLLECTED'] } }),
      Donation.countDocuments({ status: 'AVAILABLE', bestBefore: { $gt: now, $lte: in24h } }),
      PickupTask.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
      Donation.find({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
    ]);

    const portionsRedistributed = completedDonations.reduce((acc, d) => {
      const qty = d.actualQuantity ?? d.quantity;
      return d.unit === 'PORTIONS' ? acc + qty : acc;
    }, 0);

    const kilogramsRedistributed = completedDonations.reduce((acc, d) => {
      const qty = d.actualQuantity ?? d.quantity;
      return d.unit === 'KILOGRAMS' ? acc + qty : acc;
    }, 0);

    res.json({
      success: true,
      data: {
        organizations,
        pendingVerifications,
        totalUsers,
        donations,
        activeDonations,
        reservedDonations,
        openIncidents,
        incidents,
        pickupsInProgress,
        expiringListings,
        completedRedistributions,
        verifiedImpact: {
          portionsRedistributed,
          kilogramsRedistributed,
          note: 'Calculated from completed deliveries and confirmed actual counts.',
        },
      },
    });
  } catch (err) { next(err); }
});

/* ── Organizations ───────────────────────────────────────────────────── */
router.get('/organizations/pending', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Organization.find({ verificationStatus: 'PENDING' })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments({ verificationStatus: 'PENDING' }),
    ]);

    res.json({ success: true, data: { items, total, page, limit } });
  } catch (err) { next(err); }
});

router.get('/organizations', async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};
    if (status) filter.verificationStatus = status;
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await Organization.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/organizations/:id/approve', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'APPROVED', verificationNote: reason || 'Approved by admin' },
      { new: true }
    );
    if (!org) return res.status(404).json({ success: false, error: { message: 'Organization not found' } });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ORG_APPROVED',
      resource: 'Organization',
      resourceId: org._id,
      details: { reason },
    });

    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

router.post('/organizations/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'REJECTED', verificationNote: reason || 'Rejected by admin' },
      { new: true }
    );
    if (!org) return res.status(404).json({ success: false, error: { message: 'Organization not found' } });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ORG_REJECTED',
      resource: 'Organization',
      resourceId: org._id,
      details: { reason },
    });

    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

router.post('/organizations/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'SUSPENDED', verificationNote: reason || 'Suspended by admin' },
      { new: true }
    );
    if (!org) return res.status(404).json({ success: false, error: { message: 'Organization not found' } });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ORG_SUSPENDED',
      resource: 'Organization',
      resourceId: org._id,
      details: { reason },
    });

    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

/* ── Users ───────────────────────────────────────────────────────────── */
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await User.find(filter)
      .populate('organization', 'name type verificationStatus')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: items.map((u) => u.toSafe()) });
  } catch (err) { next(err); }
});

router.post('/users/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    await AuditLog.create({
      actor: req.user._id,
      action: 'USER_STATUS_CHANGE',
      resource: 'User',
      resourceId: user._id,
      details: { status, reason },
    });

    res.json({ success: true, data: user.toSafe() });
  } catch (err) { next(err); }
});

/* ── Donations Management ────────────────────────────────────────────── */
router.get('/donations', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Donation.find(filter)
        .populate('donor', 'name address location')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);

    const serialized = items.map((item) => serializeDonation(item, null, true));
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

router.post('/donations/:id/cancel', async (req, res, next) => {
  try {
    const { reason, releaseDonation } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });

    donation.status = releaseDonation ? 'CANCELLED' : 'SAFETY_HOLD';
    donation.cancelReason = reason || 'Admin cancelled';
    await donation.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'ADMIN_DONATION_CANCEL',
      resource: 'Donation',
      resourceId: donation._id,
      details: { reason, releaseDonation },
    });

    res.json({ success: true, data: serializeDonation(donation, null, true) });
  } catch (err) { next(err); }
});

router.get('/donations/:id/trace', async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name address location contactEmail contactPhone')
      .populate('createdBy', 'name email phone');

    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });

    const [reservations, pickups, incidents, logs] = await Promise.all([
      Reservation.find({ donation: donation._id }).populate('recipient', 'name address').populate('reservedBy', 'name email'),
      PickupTask.find({ donation: donation._id }).populate('assignedTo', 'name phone email'),
      Incident.find({ donation: donation._id }).populate('reportedBy', 'name email'),
      AuditLog.find({ resourceId: donation._id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        donation: serializeDonation(donation, null, true),
        reservations,
        pickups: pickups.map(serializePickupTask),
        incidents,
        auditLogs: logs,
      },
    });
  } catch (err) { next(err); }
});

/* ── Pickups Management ──────────────────────────────────────────────── */
router.get('/pickups', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      PickupTask.find(filter)
        .populate('donor', 'name address location')
        .populate('recipient', 'name address location')
        .populate('donation')
        .populate('assignedTo', 'name email phone role')
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

/* ── Incidents Management ────────────────────────────────────────────── */
router.get('/incidents', async (req, res, next) => {
  try {
    const { status, severity, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Incident.find(filter)
        .populate('donation')
        .populate('pickup')
        .populate('reportedBy', 'name email')
        .populate('organization', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Incident.countDocuments(filter),
    ]);

    const formatted = items.map((inc) => {
      const obj = inc.toObject ? inc.toObject() : { ...inc };
      obj.title = obj.title || `${(obj.type || 'INCIDENT').replace(/_/g, ' ')}: ${(obj.description || '').slice(0, 35)}...`;
      obj.reporter = obj.reportedBy;
      obj.pickupTask = obj.pickup;
      return obj;
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { next(err); }
});

router.post('/incidents/:id/resolve', async (req, res, next) => {
  try {
    const { resolution, status = 'RESOLVED' } = req.body;
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolution: resolution || 'Resolved by admin',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
      { new: true }
    );
    if (!incident) return res.status(404).json({ success: false, error: { message: 'Incident not found' } });

    await AuditLog.create({
      actor: req.user._id,
      action: 'INCIDENT_RESOLVED',
      resource: 'Incident',
      resourceId: incident._id,
      details: { resolution, status },
    });

    res.json({ success: true, data: incident });
  } catch (err) { next(err); }
});

/* ── Audit Logs ──────────────────────────────────────────────────────── */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const items = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

/* ── Admin Config ────────────────────────────────────────────────────── */
router.get('/config', async (_req, res) => {
  res.json({
    success: true,
    data: {
      platformName: 'FoodKind',
      version: '1.0.0',
      safetyProtocol: 'FSSAI / Surplus Food Standard',
      autoVerification: false,
      aiRoutingEnabled: true,
      retentionDays: 90,
    },
  });
});

/* ── Impact Analytics (Admin) ────────────────────────────────────────── */
router.get('/analytics/impact', async (_req, res, next) => {
  try {
    const completed = await Donation.find({ status: { $in: ['DELIVERED', 'COMPLETED'] } });
    const mealsDistributed = completed.reduce((acc, d) => acc + (d.impactEstimate?.mealsEquivalent || (d.actualQuantity ?? d.quantity)), 0);
    const co2SavedKg = completed.reduce((acc, d) => acc + (d.impactEstimate?.co2SavedKg || (d.actualQuantity ?? d.quantity) * 1.9), 0);
    const wastePreventedKg = completed.reduce((acc, d) => acc + (d.impactEstimate?.wastePreventedKg || (d.actualQuantity ?? d.quantity) * 0.45), 0);

    res.json({
      success: true,
      data: {
        mealsDistributed,
        co2SavedKg: Math.round(co2SavedKg * 10) / 10,
        wastePreventedKg: Math.round(wastePreventedKg * 10) / 10,
        completedRedistributions: completed.length,
      },
    });
  } catch (err) { next(err); }
});

export default router;
