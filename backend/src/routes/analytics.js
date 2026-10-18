import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Donation } from '../models/Donation.js';
import { Organization } from '../models/Organization.js';
import { Reservation } from '../models/Reservation.js';
import { PickupTask } from '../models/PickupTask.js';

const router = Router();

/* ── Overview (dashboard stats) ───────────────────────────────────────── */
router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';

    const donationFilter = isAdmin ? {} : (orgId ? { donor: orgId } : {});
    const reservationFilter = isAdmin ? {} : (orgId ? { recipient: orgId } : {});

    const [totalDonations, activeDonations, totalReservations, completedDeliveries] = await Promise.all([
      Donation.countDocuments(donationFilter),
      Donation.countDocuments({ ...donationFilter, status: { $in: ['AVAILABLE', 'PARTIALLY_RESERVED', 'RESERVED'] } }),
      Reservation.countDocuments(reservationFilter),
      PickupTask.countDocuments({ status: 'COMPLETED', ...(isAdmin ? {} : orgId ? { $or: [{ donor: orgId }, { recipient: orgId }] } : {}) }),
    ]);

    // Impact aggregation
    const impactPipeline = [
      { $match: { status: 'COMPLETED', ...donationFilter } },
      { $group: {
        _id: null,
        totalPortions: { $sum: '$quantity' },
        totalMeals: { $sum: '$impactEstimate.mealsEquivalent' },
        totalCo2Saved: { $sum: '$impactEstimate.co2SavedKg' },
        totalWastePrevented: { $sum: '$impactEstimate.wastePreventedKg' },
      }},
    ];
    const [impact] = await Donation.aggregate(impactPipeline);

    res.json({
      success: true,
      data: {
        totalDonations,
        activeDonations,
        totalReservations,
        completedDeliveries,
        impact: impact || { totalPortions: 0, totalMeals: 0, totalCo2Saved: 0, totalWastePrevented: 0 },
      },
    });
  } catch (err) { next(err); }
});

/* ── Donations analytics ──────────────────────────────────────────────── */
router.get('/donations', requireAuth, async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
      }},
      { $sort: { _id: 1 } },
    ];
    const data = await Donation.aggregate(pipeline);
    res.json({ success: true, data: { timeseries: data, period } });
  } catch (err) { next(err); }
});

/* ── Impact analytics ─────────────────────────────────────────────────── */
router.get('/impact', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.organization?._id;
    const filter = req.user.role === 'ADMIN' ? { status: 'COMPLETED' } : { status: 'COMPLETED', $or: [{ donor: orgId }] };
    
    const pipeline = [
      { $match: filter },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        mealsEquivalent: { $sum: '$impactEstimate.mealsEquivalent' },
        co2SavedKg: { $sum: '$impactEstimate.co2SavedKg' },
        wastePreventedKg: { $sum: '$impactEstimate.wastePreventedKg' },
      }},
    ];
    const byCategory = await Donation.aggregate(pipeline);

    const monthlyPipeline = [
      { $match: filter },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
        meals: { $sum: '$impactEstimate.mealsEquivalent' },
      }},
      { $sort: { _id: 1 } },
    ];
    const monthly = await Donation.aggregate(monthlyPipeline);

    res.json({ success: true, data: { byCategory, monthly } });
  } catch (err) { next(err); }
});

/* ── Forecast ─────────────────────────────────────────────────────────── */
router.get('/forecast', requireAuth, async (req, res, next) => {
  try {
    // Simple moving average forecast
    const last30 = await Donation.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, avgDaily: { $avg: '$quantity' }, total: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { forecast: last30[0] || { avgDaily: 0, total: 0, count: 0 } } });
  } catch (err) { next(err); }
});

/* ── Pickups analytics ────────────────────────────────────────────────── */
router.get('/pickups', requireAuth, async (req, res, next) => {
  try {
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ];
    const data = await PickupTask.aggregate(pipeline);
    res.json({ success: true, data: { byStatus: data } });
  } catch (err) { next(err); }
});

/* ── Organizations analytics ──────────────────────────────────────────── */
router.get('/organizations', requireAuth, async (req, res, next) => {
  try {
    const pipeline = [
      { $group: { _id: { type: '$type', status: '$verificationStatus' }, count: { $sum: 1 } } },
    ];
    const data = await Organization.aggregate(pipeline);
    res.json({ success: true, data: { breakdown: data } });
  } catch (err) { next(err); }
});

/* ── Export report (CSV / JSON) ──────────────────────────────────────── */
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const donations = await Donation.find({ status: { $in: ['COMPLETED', 'DELIVERED', 'COLLECTED'] } })
      .populate('donor', 'name')
      .sort({ createdAt: -1 })
      .limit(500);

    if (format === 'csv') {
      const headers = ['ID', 'Title', 'Category', 'Quantity', 'Unit', 'Status', 'Donor', 'Date'];
      const rows = donations.map((d) => [
        d._id,
        `"${(d.title || '').replace(/"/g, '""')}"`,
        d.category,
        d.quantity,
        d.unit,
        d.status,
        `"${(d.donor?.name || '').replace(/"/g, '""')}"`,
        d.createdAt ? d.createdAt.toISOString() : '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="foodkind-report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data: donations });
  } catch (err) { next(err); }
});

export default router;
