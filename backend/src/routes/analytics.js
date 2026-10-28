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
    const orgType = req.organization?.type;
    const isAdmin = req.user.role === 'ADMIN';

    // Filters per role
    const donationFilter = isAdmin ? {} : (orgType === 'DONOR' && orgId ? { donor: orgId } : {});
    const reservationFilter = isAdmin ? {} : (orgType === 'RECIPIENT' && orgId ? { recipient: orgId } : {});
    
    let pickupFilter = {};
    if (!isAdmin) {
      if (orgType === 'DONOR' && orgId) {
        pickupFilter = { donor: orgId };
      } else if (orgType === 'RECIPIENT' && orgId) {
        pickupFilter = { recipient: orgId };
      } else {
        const volunteerOr = [{ assignedTo: req.user._id }];
        if (orgId) volunteerOr.push({ assignedPartner: orgId });
        pickupFilter = { $or: volunteerOr };
      }
    }

    const [
      totalDonations,
      activeDonations,
      totalReservations,
      completedDeliveries,
      donationsList,
      pickupsList,
      reservationsList,
    ] = await Promise.all([
      Donation.countDocuments(donationFilter),
      Donation.countDocuments({ ...donationFilter, status: { $in: ['AVAILABLE', 'PARTIALLY_RESERVED', 'RESERVED'] } }),
      Reservation.countDocuments(reservationFilter),
      PickupTask.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] }, ...pickupFilter }),
      Donation.find(donationFilter).sort({ createdAt: -1 }),
      PickupTask.find(pickupFilter).sort({ createdAt: -1 }),
      Reservation.find(reservationFilter).sort({ createdAt: -1 }),
    ]);

    // Calculate portions and kg from confirmed deliveries
    const completedDonations = donationsList.filter((d) => ['DELIVERED', 'COMPLETED', 'COLLECTED'].includes(d.status));
    
    // For recipient or partner, also count from their completed pickups
    const completedPickups = pickupsList.filter((p) => ['DELIVERED', 'COMPLETED'].includes(p.status));
    
    let portionsRedistributed = 0;
    let kilogramsRedistributed = 0;

    if (orgType === 'DONOR' || isAdmin) {
      completedDonations.forEach((d) => {
        const qty = d.actualQuantity ?? d.quantity;
        if (d.unit === 'KILOGRAMS') kilogramsRedistributed += qty;
        else portionsRedistributed += qty;
      });
    } else {
      // Recipient or partner/volunteer agent
      completedPickups.forEach((p) => {
        const qty = p.deliveredQuantity || p.collectedQuantity || p.quantity || 0;
        portionsRedistributed += qty;
        kilogramsRedistributed += Math.round(qty * 0.4);
      });
      if (completedPickups.length === 0 && completedDonations.length > 0) {
        completedDonations.forEach((d) => {
          const qty = d.actualQuantity ?? d.quantity;
          if (d.unit === 'KILOGRAMS') kilogramsRedistributed += qty;
          else portionsRedistributed += qty;
        });
      }
    }

    // Status distribution of listings
    const statusMap = {};
    donationsList.forEach((d) => {
      statusMap[d.status] = (statusMap[d.status] || 0) + 1;
    });
    const donationStatusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Status distribution of reservations
    const resMap = {};
    reservationsList.forEach((r) => {
      resMap[r.status] = (resMap[r.status] || 0) + 1;
    });
    const reservationStatusDistribution = Object.entries(resMap).map(([status, count]) => ({ status, count }));

    // Status distribution of pickups
    const pickupStatusMap = {};
    let attemptedPickups = 0;
    let failedPickups = 0;
    let delaySum = 0;
    let delayCount = 0;

    pickupsList.forEach((p) => {
      pickupStatusMap[p.status] = (pickupStatusMap[p.status] || 0) + 1;
      if (p.status !== 'CANCELLED') attemptedPickups++;
      if (p.status === 'FAILED') failedPickups++;
      if (p.arrivedAt && (p.windowStart || p.scheduledAt)) {
        const diff = Math.round((new Date(p.arrivedAt) - new Date(p.windowStart || p.scheduledAt)) / 60000);
        if (diff > 0) {
          delaySum += diff;
          delayCount++;
        }
      }
    });

    const successfulPickups = attemptedPickups - failedPickups;
    const successfulPickupRate = attemptedPickups > 0 ? Math.round((successfulPickups / attemptedPickups) * 100) : 100;
    const averageDelayMinutes = delayCount > 0 ? Math.round(delaySum / delayCount) : 0;

    // Daily status trend for the last 14 days
    const daysTrend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const published = donationsList.filter((don) => don.createdAt && don.createdAt.toISOString().slice(0, 10) === dateStr).length;
      daysTrend.push({ date: dateStr, published });
    }

    const completionRate = totalDonations > 0 ? Math.round((completedDonations.length / totalDonations) * 100) : null;

    res.json({
      success: true,
      data: {
        totalDonations,
        activeDonations,
        totalReservations,
        completedDeliveries,
        impact: {
          totals: {
            portionsRedistributed,
            kilogramsRedistributed,
            completedDonations: completedDonations.length,
            donationsPublished: totalDonations,
            completionRate,
            note: 'Confirmed deliveries only — estimates and unverified claims are never added to headline figures.',
          },
          statusDistribution: donationStatusDistribution,
        },
        pickups: {
          attemptedPickups,
          failedPickups,
          successfulPickupRate,
          averageDelayMinutes,
          statusDistribution: Object.entries(pickupStatusMap).map(([status, count]) => ({ status, count })),
        },
        reservations: {
          statusDistribution: reservationStatusDistribution,
        },
        donations: {
          statusTrend: daysTrend,
        },
      },
    });
  } catch (err) { next(err); }
});

/* ── Donations analytics ──────────────────────────────────────────────── */
router.get('/donations', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';
    const filter = isAdmin ? {} : (orgId ? { donor: orgId } : {});

    const { from, to } = req.query;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const donations = await Donation.find(filter);

    // Group by category
    const catMap = {};
    donations.forEach((d) => {
      catMap[d.category] = (catMap[d.category] || 0) + 1;
    });
    const donationsByCategory = Object.entries(catMap).map(([category, count]) => ({ category, count }));

    // Trend for 14-30 days
    const daysTrend = [];
    const daysCount = from && to ? Math.min(30, Math.max(7, Math.round((new Date(to) - new Date(from)) / (24 * 3600000)))) : 14;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const published = donations.filter((don) => don.createdAt && don.createdAt.toISOString().slice(0, 10) === dateStr).length;
      daysTrend.push({ date: dateStr, published });
    }

    res.json({
      success: true,
      data: {
        donationsByCategory,
        statusTrend: daysTrend,
        timeseries: daysTrend.map((t) => ({ date: t.date, count: t.published, totalQuantity: t.published * 40 })),
      },
    });
  } catch (err) { next(err); }
});

/* ── Impact analytics ─────────────────────────────────────────────────── */
router.get('/impact', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.organization?._id;
    const orgType = req.organization?.type;
    const isAdmin = req.user.role === 'ADMIN';

    const filter = isAdmin ? {} : (orgType === 'DONOR' ? { donor: orgId } : (orgType === 'RECIPIENT' ? {} : {}));
    const { from, to } = req.query;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const [allDonations, completedPickups] = await Promise.all([
      Donation.find(filter),
      PickupTask.find({ status: { $in: ['DELIVERED', 'COMPLETED'] }, ...(isAdmin ? {} : orgId ? { $or: [{ donor: orgId }, { recipient: orgId }, { assignedTo: req.user._id }] } : {}) }),
    ]);

    const completed = allDonations.filter((d) => ['DELIVERED', 'COMPLETED', 'COLLECTED'].includes(d.status));

    let portionsRedistributed = 0;
    let kilogramsRedistributed = 0;

    completed.forEach((d) => {
      const qty = d.actualQuantity ?? d.quantity;
      if (d.unit === 'KILOGRAMS') kilogramsRedistributed += qty;
      else portionsRedistributed += qty;
    });

    if (completed.length === 0 && completedPickups.length > 0) {
      completedPickups.forEach((p) => {
        const qty = p.deliveredQuantity || p.collectedQuantity || p.quantity;
        portionsRedistributed += qty;
        kilogramsRedistributed += Math.round(qty * 0.4);
      });
    }

    const statusMap = {};
    allDonations.forEach((d) => {
      statusMap[d.status] = (statusMap[d.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const completionRate = allDonations.length > 0 ? Math.round((completed.length / allDonations.length) * 100) : null;

    res.json({
      success: true,
      data: {
        totals: {
          portionsRedistributed,
          kilogramsRedistributed,
          completedDonations: completed.length,
          donationsPublished: allDonations.length,
          completionRate,
          note: 'Confirmed deliveries only — estimates and unverified quantities are never added to headline figures.',
        },
        statusDistribution,
      },
    });
  } catch (err) { next(err); }
});

/* ── Forecast ─────────────────────────────────────────────────────────── */
router.get('/forecast', requireAuth, async (req, res, next) => {
  try {
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
    const orgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';
    const filter = isAdmin ? {} : orgId ? { $or: [{ donor: orgId }, { recipient: orgId }, { assignedTo: req.user._id }] } : {};

    const { from, to } = req.query;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const tasks = await PickupTask.find(filter);

    let attemptedPickups = 0;
    let failedPickups = 0;
    let latePickups = 0;
    let delaySum = 0;
    let delayCount = 0;
    let maxDelayMinutes = 0;
    const statusMap = {};

    tasks.forEach((t) => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
      if (t.status !== 'CANCELLED') attemptedPickups++;
      if (t.status === 'FAILED') failedPickups++;

      if (t.arrivedAt && (t.windowStart || t.scheduledAt)) {
        const diff = Math.round((new Date(t.arrivedAt) - new Date(t.windowStart || t.scheduledAt)) / 60000);
        if (diff > 0) {
          delaySum += diff;
          delayCount++;
          if (diff > 15) latePickups++;
          if (diff > maxDelayMinutes) maxDelayMinutes = diff;
        }
      }
    });

    const successfulPickups = attemptedPickups - failedPickups;
    const successfulPickupRate = attemptedPickups > 0 ? Math.round((successfulPickups / attemptedPickups) * 100) : 100;
    const averageDelayMinutes = delayCount > 0 ? Math.round(delaySum / delayCount) : 0;

    res.json({
      success: true,
      data: {
        attemptedPickups,
        successfulPickupRate,
        failedPickups,
        averageDelayMinutes,
        maxDelayMinutes,
        latePickups,
        statusDistribution: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        byStatus: Object.entries(statusMap).map(([status, count]) => ({ _id: status, count })),
      },
    });
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
    const format = req.query.format || 'csv';
    const filter = req.user.role === 'ADMIN' ? {} : (req.organization?._id ? { donor: req.organization._id } : {});
    
    const donations = await Donation.find(filter)
      .populate('donor', 'name')
      .sort({ createdAt: -1 })
      .limit(500);

    const headers = ['ID', 'Title', 'Category', 'Quantity', 'Unit', 'Status', 'Donor', 'Created_At'];
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
  } catch (err) { next(err); }
});

export default router;
