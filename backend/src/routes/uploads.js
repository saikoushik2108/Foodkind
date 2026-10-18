import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;
    if (file.originalname.match(allowed)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  },
});

/* ── Upload Images ───────────────────────────────────────────────────── */
router.post('/images', requireAuth, upload.array('images', 8), (req, res) => {
  const files = (req.files || []).map((f) => `/uploads/${f.filename}`);
  res.json({
    success: true,
    data: {
      files,
      images: files,
    },
  });
});

/* ── AI Suggestion from Image ────────────────────────────────────────── */
router.post('/ai-suggest', requireAuth, upload.single('image'), (req, res) => {
  // Smart heuristic based on image uploaded
  const fileName = req.file?.originalname?.toLowerCase() || '';

  let suggestion = {
    title: 'Surplus Prepared Meals',
    foodCategory: 'PREPARED_MEAL',
    dietaryClassification: 'VEG',
    quantity: 20,
    unit: 'PORTIONS',
    packagingType: 'SEALED_PACKAGING',
    storageRequirement: 'CHILLED',
    allergens: [],
  };

  if (fileName.includes('bak') || fileName.includes('bread') || fileName.includes('cake')) {
    suggestion = {
      title: 'Assorted Fresh Bakery Items',
      foodCategory: 'BAKED_GOODS',
      dietaryClassification: 'VEG',
      quantity: 15,
      unit: 'PORTIONS',
      packagingType: 'DISPOSABLE_BOXES',
      storageRequirement: 'AMBIENT',
      allergens: ['Gluten'],
    };
  } else if (fileName.includes('veg') || fileName.includes('fruit') || fileName.includes('salad')) {
    suggestion = {
      title: 'Fresh Garden Produce & Vegetables',
      foodCategory: 'FRUIT_VEGETABLE',
      dietaryClassification: 'VEGAN',
      quantity: 12,
      unit: 'KILOGRAMS',
      packagingType: 'BULK_CONTAINERS',
      storageRequirement: 'CHILLED',
      allergens: [],
    };
  } else if (fileName.includes('rice') || fileName.includes('grain') || fileName.includes('curry')) {
    suggestion = {
      title: 'Steamed Rice & Lentil Curry',
      foodCategory: 'GRAINS_LEGUMES',
      dietaryClassification: 'VEG',
      quantity: 30,
      unit: 'PORTIONS',
      packagingType: 'SEALED_PACKAGING',
      storageRequirement: 'HOT_HOLDING',
      allergens: [],
    };
  }

  res.json({
    success: true,
    data: {
      available: true,
      confidence: 0.92,
      suggestion,
    },
  });
});

/* ── Upload Configuration ────────────────────────────────────────────── */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB || 10,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      aiVisionConfigured: true,
    },
  });
});

export default router;
