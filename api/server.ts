import 'dotenv/config';
import dns from 'dns';

// Ensure IPv4 is prioritized for all outbound requests in the backend process
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import productRoutes from './routes/products.routes.js';
import hamperRoutes from './routes/hampers.routes.js';
import customHamperRoutes from './routes/customHampers.routes.js';
import boxRoutes from './routes/boxes.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/orders.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import couponRoutes from './routes/coupons.routes.js';
import shippingRoutes from './routes/shipping.routes.js';
import heroSlideRoutes from './routes/heroSlides.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import searchRoutes from './routes/search.routes.js';
import adminRoutes from './routes/admin.routes.js';
import qrCodeRoutes from './routes/qrCode.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import webhookRoutes from './routes/webhooks.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { validateServerEnvironment } from './config/envValidation.js';
import { verifyDatabaseConnection } from './config/prisma.js';
import helmet from 'helmet';
import { generalApiLimiter } from './middleware/rateLimiter.js';

validateServerEnvironment();

export const app = express();

// Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Managed by client build and meta headers
  })
);

// Secure & Resilient CORS Configuration
const configuredOrigins = [
  process.env.APP_URL,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, or same-origin)
      if (!origin) return callback(null, true);

      // In non-production, allow all origins
      if (process.env.NODE_ENV !== 'production') return callback(null, true);

      // Check configured origins
      if (
        configuredOrigins.some(
          (o) => origin === o || origin.endsWith(o.replace(/^https?:\/\//, ''))
        )
      ) {
        return callback(null, true);
      }

      // Automatically allow all *.vercel.app, *.onrender.com, *.railway.app, and nestcareconnect domains
      const isAllowedCloudDomain =
        /^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(origin) ||
        /^https:\/\/([a-zA-Z0-9_-]+\.)*onrender\.com$/.test(origin) ||
        /^https:\/\/([a-zA-Z0-9_-]+\.)*up\.railway\.app$/.test(origin) ||
        /^https:\/\/(www\.)?nestcareconnect\.com$/.test(origin);

      if (isAllowedCloudDomain) {
        return callback(null, true);
      }

      // Reject CORS gracefully without crashing Express
      console.warn(`[CORS] Request origin blocked: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Path normalization middleware for serverless/reverse-proxy hosting
// When deployed behind Vercel or reverse proxy rewrites, the '/api' prefix may be stripped
app.use((req, _res, next) => {
  if (
    !req.url.startsWith('/api') &&
    !req.url.startsWith('/uploads') &&
    req.url !== '/' &&
    req.url !== '/health'
  ) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  next();
});

// General API Rate Limiter
app.use('/api', generalApiLimiter);

app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder with nosniff and dotfile protection
import { uploadDir } from './middleware/upload.js';

if (fs.existsSync(uploadDir)) {
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(uploadDir, {
      dotfiles: 'ignore',
      index: false,
    })
  );
}

// Health Check & Live Database Verification
const healthHandler = async (_req: express.Request, res: express.Response) => {
  const dbStatus = await verifyDatabaseConnection();
  const statusCode = dbStatus.ok ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.ok ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'Nest Care Connect API v1.0',
    database: {
      connected: dbStatus.ok,
      latencyMs: dbStatus.latencyMs,
      categoryCount: dbStatus.categoryCount ?? 0,
      productCount: dbStatus.productCount ?? 0,
      hamperCount: dbStatus.hamperCount ?? 0,
      orderCount: dbStatus.orderCount ?? 0,
      userCount: dbStatus.userCount ?? 0,
      error: dbStatus.error,
      diagnostics: dbStatus.diagnostics,
    },
    environment: process.env.NODE_ENV || 'development',
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/hampers', hamperRoutes);
app.use('/api/custom-hampers', customHamperRoutes);
app.use('/api/boxes', boxRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/hero-slides', heroSlideRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/qr-codes', qrCodeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/webhooks', webhookRoutes);

// Static client build serving (for production and unified preview)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, '/').endsWith('api/server.ts') ||
   process.argv[1].replace(/\\/g, '/').endsWith('api/server.js') ||
   process.env.RUN_SERVER === 'true');

if (isDirectExecution && (process.env.NODE_ENV !== 'production' || !process.env.VERCEL)) {
  app.listen(PORT, async () => {
    console.log(`🌿 Nest Care Connect backend server running on http://localhost:${PORT}`);
    // Warm up database connection on server start
    const dbStatus = await verifyDatabaseConnection();
    if (dbStatus.ok) {
      console.log(`🗄️  [DATABASE] Connected to Neon PostgreSQL (${dbStatus.latencyMs}ms, ${dbStatus.categoryCount} categories found)`);
    } else {
      console.warn(`⚠️  [DATABASE] Initial connection notice: ${dbStatus.error}`);
    }
  });
}

export default app;
