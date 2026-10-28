import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PredictionLog } from '../models/PredictionLog.js';
import { Donation } from '../models/Donation.js';

const router = Router();

/* ── Create surplus prediction ────────────────────────────────────────── */
router.post('/surplus', requireAuth, async (req, res, next) => {
  try {
    const d = req.body;
    const orgId = req.organization?._id;
    const covers = Number(d.expectedCovers) || 0;
    const targetDate = d.targetDate ? new Date(d.targetDate) : new Date(Date.now() + 24 * 3600000);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Look up historical logs with actuals
    const pastLogs = await PredictionLog.find({
      organization: orgId,
      actualQuantity: { $ne: null },
    }).sort({ targetDate: -1 }).limit(20);

    const historicalSamples = pastLogs.length;
    let baseSurplus = 40;
    let weightedAvg = 0;
    let dayOfWeekAvg = 0;

    if (historicalSamples > 0) {
      let weightSum = 0;
      let valSum = 0;
      pastLogs.forEach((log, idx) => {
        const weight = pastLogs.length - idx;
        valSum += log.actualQuantity * weight;
        weightSum += weight;
      });
      weightedAvg = Math.round(valSum / weightSum);

      const sameDayLogs = pastLogs.filter((l) => {
        const dName = new Date(l.targetDate).toLocaleDateString('en-US', { weekday: 'long' });
        return dName === dayOfWeek;
      });

      if (sameDayLogs.length >= 2) {
        dayOfWeekAvg = Math.round(sameDayLogs.reduce((acc, l) => acc + l.actualQuantity, 0) / sameDayLogs.length);
        baseSurplus = Math.round(weightedAvg * 0.6 + dayOfWeekAvg * 0.4);
      } else {
        baseSurplus = weightedAvg;
      }
    } else {
      // Check past completed donations if any
      const pastDonations = await Donation.find({
        donor: orgId,
        actualQuantity: { $ne: null },
      }).limit(10);
      if (pastDonations.length > 0) {
        baseSurplus = Math.round(pastDonations.reduce((acc, d) => acc + d.actualQuantity, 0) / pastDonations.length);
      } else if (covers > 0) {
        // Assume ~15% surplus covers
        baseSurplus = Math.max(15, Math.round(covers * 0.15));
      }
    }

    // Scale slightly with covers if covers provided and > 100
    if (covers > 100) {
      const coverFactor = Math.min(1.4, Math.max(0.7, covers / 200));
      baseSurplus = Math.round(baseSurplus * coverFactor);
    }

    const variance = Math.max(5, Math.round(baseSurplus * 0.2));
    const lowerBound = Math.max(0, baseSurplus - variance);
    const upperBound = baseSurplus + variance;
    const insufficientData = historicalSamples < 3;

    const explanation = insufficientData
      ? `Estimated at ${baseSurplus} ${String(d.unit || 'portions').toLowerCase()} based on current capacity and estimated covers (${covers || 'standard'}). Flagged as low confidence due to limited historical evaluations.`
      : `Forecast based on ${historicalSamples} evaluated historical surpluses${dayOfWeekAvg ? ` and ${dayOfWeek} trends` : ''}. Range between ${lowerBound} and ${upperBound} reflects typical observed variance.`;

    const prediction = await PredictionLog.create({
      organization: orgId,
      createdBy: req.user._id,
      category: d.category || 'PREPARED_MEAL',
      mealPeriod: d.mealPeriod || 'LUNCH',
      targetDate,
      predictedDate: targetDate,
      expectedCovers: covers,
      predictedQuantity: baseSurplus,
      lowerBound,
      upperBound,
      confidenceLow: lowerBound,
      confidenceHigh: upperBound,
      insufficientData,
      explanation,
      features: {
        historicalSamples,
        dayOfWeek,
        weightedAverage: weightedAvg || baseSurplus,
        dayOfWeekAverage: dayOfWeekAvg || null,
      },
      unit: d.unit || 'PORTIONS',
      method: 'Weighted Moving Average Blend',
      modelVersion: 'v1.4 (Surplus Forecast Engine)',
      notes: d.notes || '',
    });

    res.status(201).json({ success: true, data: prediction });
  } catch (err) { next(err); }
});

/* ── Prediction history ───────────────────────────────────────────────── */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { organization: req.organization?._id };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      PredictionLog.find(filter).sort({ targetDate: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      PredictionLog.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { next(err); }
});

/* ── Record actual ────────────────────────────────────────────────────── */
router.post('/:id/actual', requireAuth, async (req, res, next) => {
  try {
    const item = await PredictionLog.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    
    const actual = Number(req.body.actualQuantity);
    item.actualQuantity = actual;
    item.absoluteError = Math.abs(item.predictedQuantity - actual);
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Metrics ──────────────────────────────────────────────────────────── */
router.get('/metrics', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.organization?._id;
    const filter = { organization: orgId, actualQuantity: { $ne: null } };
    const evaluated = await PredictionLog.find(filter).sort({ targetDate: -1 }).limit(100);

    const evaluatedCount = evaluated.length;
    let totalAbsError = 0;
    let totalPctError = 0;
    let nonZeroCount = 0;

    for (const p of evaluated) {
      const err = Math.abs(p.predictedQuantity - p.actualQuantity);
      totalAbsError += err;
      if (p.actualQuantity > 0) {
        totalPctError += (err / p.actualQuantity) * 100;
        nonZeroCount++;
      }
    }

    const mae = evaluatedCount > 0 ? Math.round((totalAbsError / evaluatedCount) * 10) / 10 : null;
    const meanPercentageError = nonZeroCount > 0 ? Math.round((totalPctError / nonZeroCount) * 10) / 10 : null;

    res.json({
      success: true,
      data: {
        evaluatedCount,
        mae,
        meanPercentageError,
        modelVersion: 'v1.4 (Surplus Forecast Engine)',
        method: 'Weighted Moving Average Blend',
        message: evaluatedCount > 0
          ? `Metrics evaluated across ${evaluatedCount} recorded actual surplus count${evaluatedCount === 1 ? '' : 's'}.`
          : 'Record actual surplus after food services to evaluate the AI forecasting engine.',
        accuracy: meanPercentageError !== null ? Math.max(0, Math.round(100 - meanPercentageError)) : 0,
      },
    });
  } catch (err) { next(err); }
});

export default router;
