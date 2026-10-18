import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env.js';
import { csrfGuard } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRouter from './routes/auth.js';
import organizationsRouter from './routes/organizations.js';
import donationsRouter from './routes/donations.js';
import reservationsRouter from './routes/reservations.js';
import demandRequestsRouter from './routes/demandRequests.js';
import pickupsRouter from './routes/pickups.js';
import predictionsRouter from './routes/predictions.js';
import notificationsRouter from './routes/notifications.js';
import analyticsRouter from './routes/analytics.js';
import incidentsRouter from './routes/incidents.js';
import uploadsRouter from './routes/uploads.js';
import adminRouter from './routes/admin.js';

export const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - Supports custom origins and Vercel deployments
const configuredOrigins = (env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      configuredOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Body parsing & cookies
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Static files for uploaded images
const uploadDir = path.resolve(env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// CSRF check on mutations
app.use(csrfGuard);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'foodkind-api', timestamp: new Date().toISOString() });
});
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', name: 'foodkind-api', timestamp: new Date().toISOString() });
});

// Mount API v1 routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/donations', donationsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/demand-requests', demandRequestsRouter);
app.use('/api/v1/pickups', pickupsRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/incidents', incidentsRouter);
app.use('/api/v1/uploads', uploadsRouter);
app.use('/api/v1/admin', adminRouter);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
});

// Global error handler
app.use(errorHandler);
