import { Router } from 'express';
import { requireAuth, requireOrgType, requireVerified } from '../middleware/auth.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';
import { Organization } from '../models/Organization.js';

const router = Router();

/* ── List donations (marketplace) ─────────────────────────────────────── */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { category, dietary, status, search, lat, lng, radiusKm, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    // By default marketplace shows AVAILABLE / PARTIALLY_RESERVED
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['AVAILABLE', 'PARTIALLY_RESERVED'] };
    }

    if (category) filter.category = category;
    if (dietary) filter.dietaryClassification = dietary;
    if (search) filter.title = { $regex: search, $options: 'i' };

    if (lat && lng && radiusKm) {
      filter.pickupLocation = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radiusKm) * 1000,
        },
      };
    }

    filter.bestBefore = { $gt: new Date() };

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 };
    const [items, total] = await Promise.all([
      Donation.find(filter).populate('donor', 'name type address location').sort(sortObj).skip(skip).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── My donations ─────────────────────────────────────────────────────── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { donor: req.organization?._id };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
});

/* ── Get single donation ──────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('donor', 'name type address location verificationStatus');
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Create donation ──────────────────────────────────────────────────── */
router.post('/', requireAuth, requireOrgType('DONOR'), requireVerified, async (req, res, next) => {
  try {
    const d = req.body;
    const donation = await Donation.create({
      donor: req.organization._id,
      createdBy: req.user._id,
      title: d.title,
      description: d.description || '',
      category: d.category,
      dietaryClassification: d.dietaryClassification || 'UNSPECIFIED',
      allergens: d.allergens || [],
      quantity: d.quantity,
      remainingQuantity: d.quantity,
      unit: d.unit || 'PORTIONS',
      packagingType: d.packagingType || 'SEALED_PACKAGING',
      storageRequirement: d.storageRequirement || 'AMBIENT',
      pickupArrangement: d.pickupArrangement || 'BOTH',
      mealPeriod: d.mealPeriod || 'LUNCH',
      preparedAt: d.preparedAt || new Date(),
      bestBefore: d.bestBefore,
      pickupWindowStart: d.pickupWindowStart,
      pickupWindowEnd: d.pickupWindowEnd,
      pickupLocation: d.pickupLocation || req.organization.location,
      pickupAddress: d.pickupAddress || req.organization.address?.line || '',
      images: d.images || [],
      safetyDeclaration: d.safetyDeclaration || { properlyStored: true, freshlyPrepared: true, noContamination: true, declaredAt: new Date() },
      status: 'DRAFT',
      impactEstimate: {
        mealsEquivalent: Math.round(d.quantity * (d.unit === 'KILOGRAMS' ? 2.5 : 1)),
        co2SavedKg: Math.round(d.quantity * (d.unit === 'KILOGRAMS' ? 2.5 : 0.5)),
        wastePreventedKg: d.unit === 'KILOGRAMS' ? d.quantity : Math.round(d.quantity * 0.4),
      },
    });
    res.status(201).json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Update donation ──────────────────────────────────────────────────── */
router.patch('/:id', requireAuth, requireOrgType('DONOR'), async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    if (String(donation.donor) !== String(req.organization._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not your donation' } });
    }
    if (donation.status !== 'DRAFT') {
      return res.status(422).json({ success: false, error: { message: 'Can only edit draft donations' } });
    }

    const allowed = ['title', 'description', 'category', 'dietaryClassification', 'allergens', 'quantity', 'unit', 'packagingType', 'storageRequirement', 'pickupArrangement', 'mealPeriod', 'preparedAt', 'bestBefore', 'pickupWindowStart', 'pickupWindowEnd', 'pickupLocation', 'pickupAddress', 'images', 'safetyDeclaration'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) donation[key] = req.body[key];
    }
    if (req.body.quantity) donation.remainingQuantity = req.body.quantity;
    await donation.save();
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Publish donation ─────────────────────────────────────────────────── */
router.post('/:id/publish', requireAuth, requireOrgType('DONOR'), requireVerified, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (String(donation.donor) !== String(req.organization._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not your donation' } });
    }
    if (donation.status !== 'DRAFT') {
      return res.status(422).json({ success: false, error: { message: 'Only drafts can be published' } });
    }
    donation.status = 'AVAILABLE';
    await donation.save();
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Cancel donation ──────────────────────────────────────────────────── */
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    donation.status = 'CANCELLED';
    donation.cancelReason = req.body.reason || '';
    await donation.save();
    // Cancel active reservations
    await Reservation.updateMany(
      { donation: donation._id, status: { $in: ['RESERVED', 'ACCEPTED'] } },
      { status: 'CANCELLED', cancelReason: 'Donation cancelled' }
    );
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Confirm actual quantity ──────────────────────────────────────────── */
router.post('/:id/actual', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    donation.actualQuantity = req.body.actualQuantity;
    await donation.save();
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

/* ── Find matching recipients ─────────────────────────────────────────── */
router.get('/:id/matches', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    const filter = {
      type: 'RECIPIENT',
      verificationStatus: 'APPROVED',
    };

    if (donation.pickupLocation?.coordinates) {
      filter.location = {
        $nearSphere: {
          $geometry: donation.pickupLocation,
          $maxDistance: 50000, // 50km
        },
      };
    }

    const recipients = await Organization.find(filter).limit(20);
    res.json({ success: true, data: recipients });
  } catch (err) { next(err); }
});

/* ── Reserve from donation ────────────────────────────────────────────── */
router.post('/:id/reservations', requireAuth, requireOrgType('RECIPIENT'), requireVerified, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (!['AVAILABLE', 'PARTIALLY_RESERVED'].includes(donation.status)) {
      return res.status(422).json({ success: false, error: { message: 'Donation is not available for reservation' } });
    }

    const qty = Number(req.body.quantity);
    if (!qty || qty <= 0 || qty > donation.remainingQuantity) {
      return res.status(422).json({ success: false, error: { message: `Requested quantity exceeds available (${donation.remainingQuantity})` } });
    }

    const reservation = await Reservation.create({
      donation: donation._id,
      recipient: req.organization._id,
      reservedBy: req.user._id,
      quantity: qty,
      notes: req.body.notes || '',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    });

    donation.remainingQuantity -= qty;
    donation.status = donation.remainingQuantity <= 0 ? 'RESERVED' : 'PARTIALLY_RESERVED';
    await donation.save();

    res.status(201).json({ success: true, data: reservation });
  } catch (err) { next(err); }
});

export default router;
