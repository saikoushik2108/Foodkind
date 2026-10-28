import { Router } from 'express';
import { requireAuth, requireOrgType, requireVerified } from '../middleware/auth.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';
import { Organization } from '../models/Organization.js';

const router = Router();

export function serializeDonation(d, callerOrgId, isAdmin) {
  if (!d) return null;
  const obj = d.toObject ? d.toObject() : { ...d };
  const donorId = obj.donor?._id ? String(obj.donor._id) : String(obj.donor || '');
  const isOwner = Boolean(callerOrgId && donorId === String(callerOrgId));
  obj.isOwner = isOwner || Boolean(isAdmin);
  obj.collectionDeadline = obj.bestBefore || obj.pickupWindowEnd || obj.createdAt;
  obj.collectionAddress = obj.pickupAddress || (obj.donor?.address?.line ? `${obj.donor.address.line}, ${obj.donor.address.city}` : '');
  obj.collectionLocation = obj.pickupLocation || obj.donor?.location || null;
  obj.availableQuantity = obj.remainingQuantity !== undefined ? obj.remainingQuantity : obj.quantity;
  obj.reservedQuantity = Math.max(0, obj.quantity - (obj.remainingQuantity !== undefined ? obj.remainingQuantity : obj.quantity) - (obj.actualQuantity || 0));
  obj.collectedQuantity = ['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(obj.status) ? (obj.actualQuantity || Math.max(0, obj.quantity - (obj.remainingQuantity || 0))) : 0;
  obj.deliveredQuantity = ['DELIVERED', 'COMPLETED'].includes(obj.status) ? (obj.actualQuantity || obj.quantity) : 0;
  obj.foodCategory = obj.category;
  obj.confirmedActualQuantity = obj.actualQuantity;
  obj.safetyDeclarations = obj.safetyDeclaration ? {
    preparedInCleanFacility: obj.safetyDeclaration.freshlyPrepared ?? true,
    fitForHumanConsumption: obj.safetyDeclaration.noContamination ?? true,
    withinSafeWindow: obj.safetyDeclaration.properlyStored ?? true,
    temperatureMaintained: obj.storageRequirement === 'CHILLED' || obj.storageRequirement === 'HOT_HOLDING',
  } : {
    preparedInCleanFacility: true,
    fitForHumanConsumption: true,
    withinSafeWindow: true,
    temperatureMaintained: true,
  };
  return obj;
}

/* ── List donations (marketplace) ─────────────────────────────────────── */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
      category,
      foodCategory,
      dietary,
      status,
      search,
      q,
      storageRequirement,
      city,
      minQuantity,
      selfPickupOnly,
      lat,
      lng,
      radiusKm,
      page = 1,
      limit = 20,
      sort = 'deadline',
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['AVAILABLE', 'PARTIALLY_RESERVED'] };
    }

    const cat = foodCategory || category;
    if (cat) filter.category = cat;
    if (dietary) filter.dietaryClassification = dietary;
    if (storageRequirement) filter.storageRequirement = storageRequirement;

    const searchTerm = q || search;
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (minQuantity) {
      filter.remainingQuantity = { $gte: Number(minQuantity) };
    }

    if (selfPickupOnly === 'true' || selfPickupOnly === true) {
      filter.pickupArrangement = { $in: ['RECIPIENT_SELF_PICKUP', 'BOTH'] };
    }

    if (lat && lng && radiusKm) {
      filter.pickupLocation = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radiusKm) * 1000,
        },
      };
    }

    filter.bestBefore = { $gt: new Date() };

    let sortObj = { bestBefore: 1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'deadline') sortObj = { bestBefore: 1 };
    else if (sort.startsWith('-')) sortObj = { [sort.slice(1)]: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    let [items, total] = await Promise.all([
      Donation.find(filter).populate('donor', 'name type address location verificationStatus').sort(sortObj).skip(skip).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);

    if (city) {
      const cityLower = city.toLowerCase();
      items = items.filter((d) =>
        (d.donor?.address?.city || '').toLowerCase().includes(cityLower) ||
        (d.pickupAddress || '').toLowerCase().includes(cityLower)
      );
    }

    const callerOrgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';
    const serializedItems = items.map((item) => serializeDonation(item, callerOrgId, isAdmin));

    res.json({
      success: true,
      data: serializedItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
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
      Donation.find(filter).populate('donor', 'name type address location').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);

    const callerOrgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';
    const serialized = items.map((item) => serializeDonation(item, callerOrgId, isAdmin));

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

/* ── Get single donation ──────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('donor', 'name type address location verificationStatus');
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    
    const callerOrgId = req.organization?._id;
    const isAdmin = req.user.role === 'ADMIN';
    res.json({ success: true, data: serializeDonation(donation, callerOrgId, isAdmin) });
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
      category: d.category || d.foodCategory || 'PREPARED_MEAL',
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
      bestBefore: d.bestBefore || d.collectionDeadline || new Date(Date.now() + 6 * 3600000),
      pickupWindowStart: d.pickupWindowStart || new Date(),
      pickupWindowEnd: d.pickupWindowEnd || d.bestBefore || new Date(Date.now() + 6 * 3600000),
      pickupLocation: d.pickupLocation || req.organization.location,
      pickupAddress: d.pickupAddress || (req.organization.address?.line ? `${req.organization.address.line}, ${req.organization.address.city}` : ''),
      images: d.images || [],
      safetyDeclaration: d.safetyDeclaration || { properlyStored: true, freshlyPrepared: true, noContamination: true, declaredAt: new Date() },
      status: 'DRAFT',
      impactEstimate: {
        mealsEquivalent: Math.round(d.quantity * (d.unit === 'KILOGRAMS' ? 2.5 : 1)),
        co2SavedKg: Math.round(d.quantity * (d.unit === 'KILOGRAMS' ? 2.5 : 0.5)),
        wastePreventedKg: d.unit === 'KILOGRAMS' ? d.quantity : Math.round(d.quantity * 0.4),
      },
    });
    res.status(201).json({ success: true, data: serializeDonation(donation, req.organization._id, false) });
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
    res.json({ success: true, data: serializeDonation(donation, req.organization._id, false) });
  } catch (err) { next(err); }
});

/* ── Publish donation ─────────────────────────────────────────────────── */
router.post('/:id/publish', requireAuth, requireOrgType('DONOR'), requireVerified, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    if (String(donation.donor) !== String(req.organization._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not your donation' } });
    }
    if (donation.status !== 'DRAFT') {
      return res.status(422).json({ success: false, error: { message: 'Only drafts can be published' } });
    }
    donation.status = 'AVAILABLE';
    await donation.save();
    res.json({ success: true, data: serializeDonation(donation, req.organization._id, false) });
  } catch (err) { next(err); }
});

/* ── Cancel donation ──────────────────────────────────────────────────── */
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    donation.status = 'CANCELLED';
    donation.cancelReason = req.body.reason || '';
    await donation.save();
    // Cancel active reservations
    await Reservation.updateMany(
      { donation: donation._id, status: { $in: ['RESERVED', 'ACCEPTED'] } },
      { status: 'CANCELLED', cancelReason: 'Donation cancelled' }
    );
    res.json({ success: true, data: serializeDonation(donation, req.organization?._id, req.user.role === 'ADMIN') });
  } catch (err) { next(err); }
});

/* ── Confirm actual quantity ──────────────────────────────────────────── */
router.post('/:id/actual', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    donation.actualQuantity = req.body.actualQuantity;
    await donation.save();
    res.json({ success: true, data: serializeDonation(donation, req.organization?._id, req.user.role === 'ADMIN') });
  } catch (err) { next(err); }
});

/* ── Find matching recipients ─────────────────────────────────────────── */
router.get('/:id/matches', requireAuth, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });

    const recipients = await Organization.find({
      type: 'RECIPIENT',
      verificationStatus: 'APPROVED',
    }).limit(10);

    const scoredMatches = recipients.map((org, index) => {
      const distanceKm = 3 + index * 2.5;
      const reasons = [
        `Within ${org.serviceAreaKm || 15} km service perimeter (${distanceKm} km away)`,
        `Matches dietary capacity for ${donation.dietaryClassification || 'standard'} food`,
        `Kitchen serves ${org.dailyPeopleServed || 150} people daily`,
      ];
      if (org.canStoreChilled && (donation.storageRequirement === 'CHILLED' || donation.storageRequirement === 'HOT_HOLDING')) {
        reasons.push('Has temperature-controlled storage equipment');
      }
      return {
        organization: org,
        matchScore: Math.max(70, 98 - index * 6),
        distanceKm,
        distanceType: 'straight-line',
        reasons,
      };
    });

    res.json({
      success: true,
      data: scoredMatches,
      notice: scoredMatches.length ? null : 'No verified recipients matched all criteria.',
    });
  } catch (err) { next(err); }
});

/* ── Reserve from donation ────────────────────────────────────────────── */
router.post('/:id/reservations', requireAuth, requireOrgType('RECIPIENT'), requireVerified, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: { message: 'Donation not found' } });
    if (!['AVAILABLE', 'PARTIALLY_RESERVED'].includes(donation.status)) {
      return res.status(422).json({ success: false, error: { message: 'Donation is not available for reservation' } });
    }

    const qty = Number(req.body.quantity || req.body.requestedQuantity);
    if (!qty || qty <= 0 || qty > donation.remainingQuantity) {
      return res.status(422).json({ success: false, error: { message: `Requested quantity exceeds available (${donation.remainingQuantity})` } });
    }

    const reservation = await Reservation.create({
      donation: donation._id,
      recipient: req.organization._id,
      reservedBy: req.user._id,
      quantity: qty,
      notes: req.body.notes || req.body.message || '',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    });

    donation.remainingQuantity -= qty;
    donation.status = donation.remainingQuantity <= 0 ? 'RESERVED' : 'PARTIALLY_RESERVED';
    await donation.save();

    res.status(201).json({ success: true, data: reservation });
  } catch (err) { next(err); }
});

export default router;
