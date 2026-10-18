import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PredictionLog } from '../models/PredictionLog.js';

const router = Router();

/* ── Create surplus prediction ────────────────────────────────────────── */
router.post('/surplus', requireAuth, async (req, res, next) => {
  try {
    const d = req.body;
    // Simple predictive logic (in production this would use ML)
    const predicted = Number(d.estimatedQuantity) || Number(d.quantity) || 50;
    const variance = Math.round(predicted * 0.15);
    
    const prediction = await PredictionLog.create({
      organization: req.organization?._id,
      createdBy: req.user._id,
      category: d.category || 'PREPARED_MEAL',
      mealPeriod: d.mealPeriod || 'LUNCH',
      predictedDate: d.predictedDate || new Date(),
      predictedQuantity: predicted,
      confidenceLow: Math.max(0, predicted - variance),
      confidenceHigh: predicted + variance,
      unit: d.unit || 'PORTIONS',
      method: 'HEURISTIC',
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
      PredictionLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      PredictionLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Record actual ────────────────────────────────────────────────────── */
router.post('/:id/actual', requireAuth, async (req, res, next) => {
  try {
    const item = await PredictionLog.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.actualQuantity = Number(req.body.actualQuantity);
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Metrics ──────────────────────────────────────────────────────────── */
router.get('/metrics', requireAuth, async (req, res, next) => {
  try {
    const filter = { organization: req.organization?._id, actualQuantity: { $ne: null } };
    const predictions = await PredictionLog.find(filter).sort({ predictedDate: -1 }).limit(100);
    
    let totalError = 0;
    let count = 0;
    for (const p of predictions) {
      if (p.actualQuantity !== null) {
        totalError += Math.abs(p.predictedQuantity - p.actualQuantity);
        count++;
      }
    }

    res.json({
      success: true,
      data: {
        totalPredictions: await PredictionLog.countDocuments({ organization: req.organization?._id }),
        withActuals: count,
        averageError: count > 0 ? Math.round(totalError / count) : 0,
        accuracy: count > 0 ? Math.round(100 - (totalError / count / (predictions[0]?.predictedQuantity || 1) * 100)) : 0,
      },
    });
  } catch (err) { next(err); }
});

export default router;
