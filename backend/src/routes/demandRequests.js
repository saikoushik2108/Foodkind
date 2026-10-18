import { Router } from 'express';
import { requireAuth, requireOrgType } from '../middleware/auth.js';
import { DemandRequest } from '../models/DemandRequest.js';

const router = Router();

/* ── Create demand request ────────────────────────────────────────────── */
router.post('/', requireAuth, requireOrgType('RECIPIENT'), async (req, res, next) => {
  try {
    const d = req.body;
    const item = await DemandRequest.create({
      organization: req.organization._id,
      createdBy: req.user._id,
      title: d.title,
      description: d.description || '',
      category: d.category || 'PREPARED_MEAL',
      dietaryClassification: d.dietaryClassification || 'UNSPECIFIED',
      quantityNeeded: d.quantityNeeded,
      unit: d.unit || 'PORTIONS',
      neededBy: d.neededBy,
      mealPeriod: d.mealPeriod || 'LUNCH',
      notes: d.notes || '',
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── My demand requests ───────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.organization?._id };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      DemandRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      DemandRequest.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Open demand requests (for donors to see) ─────────────────────────── */
router.get('/open', requireAuth, async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const filter = { status: { $in: ['OPEN', 'PARTIALLY_FULFILLED'] } };
    if (category) filter.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      DemandRequest.find(filter).populate('organization', 'name address location').sort({ neededBy: 1 }).skip(skip).limit(Number(limit)),
      DemandRequest.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Forecast / summary ───────────────────────────────────────────────── */
router.get('/forecast', requireAuth, async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { status: { $in: ['OPEN', 'PARTIALLY_FULFILLED'] } } },
      { $group: { _id: '$category', totalNeeded: { $sum: '$quantityNeeded' }, totalFulfilled: { $sum: '$quantityFulfilled' }, count: { $sum: 1 } } },
    ];
    const results = await DemandRequest.aggregate(pipeline);
    res.json({ success: true, data: { categories: results, generated: new Date() } });
  } catch (err) { next(err); }
});

/* ── Get single ───────────────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await DemandRequest.findById(req.params.id).populate('organization', 'name');
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Update ───────────────────────────────────────────────────────────── */
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await DemandRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    const allowed = ['title', 'description', 'category', 'dietaryClassification', 'quantityNeeded', 'unit', 'neededBy', 'mealPeriod', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    }
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Cancel ────────────────────────────────────────────────────────────── */
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const item = await DemandRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    item.status = 'CANCELLED';
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

export default router;
