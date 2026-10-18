import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';

const router = Router();

/* ── List notifications ───────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { read, page = 1, limit = 30 } = req.query;
    const filter = { user: req.user._id };
    if (read !== undefined) filter.read = read === 'true';
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(filter),
    ]);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }, meta: { unreadCount } });
  } catch (err) { next(err); }
});

/* ── Mark read ────────────────────────────────────────────────────────── */
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/* ── Mark all read ────────────────────────────────────────────────────── */
router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true, data: { message: 'All marked as read' } });
  } catch (err) { next(err); }
});

export default router;
