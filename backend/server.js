import express from 'express';
import dotenv from 'dotenv';
import mongoose from "mongoose";
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import sellerRouter from './routes/sellerRoutes.js'
import uploadRouter from "./routes/uploadRoutes.js";
import contactRouter from './routes/contactRoutes.js'
import serviceProviderRouter from './routes/serviceProviderRoutes.js'
import blogRouter from './routes/blogRoutes.js'
import notificationRouter from './routes/notificationRoutes.js';
import annotationRoutes from './routes/annotationRoutes.js'
import engineerAnnotationRoutes from './routes/engineerAnnotationRoutes.js';
import browsingHistoryRouter from './routes/browsingHistoryRoutes.js';
import userReviewsRouter from './routes/userReviewsRoutes.js';
import wishlistRouter from './routes/wishlistRoutes.js';
import roiRouter from './routes/roiCalculationRoutes.js';
import demoRequestRouter from './routes/demoRequestRoutes.js';
import newsletterRouter from './routes/newsletterRoutes.js';
import hvacZoneRouter from './routes/hvacZoneRoutes.js';
import { isAuth } from './utils.js';
import path from "path";
import cors from 'cors';
import Notification from './models/notificationModel.js';
import { startPaymentReminderJob } from './utils/paymentReminderJob.js';
import { startOverdueDeliveryReminders } from './utils/cronJobs.js';

dotenv.config();

let server;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Start scheduled jobs
    startPaymentReminderJob();
    startOverdueDeliveryReminders();

    const port = process.env.PORT || 5020;
    server = app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (err.reason) {
      console.error("MongoDB connection details:", err.reason);
    }
    process.exit(1);
  }
}

const app = express();

// Trust the first proxy (required for rate limiting to work correctly on
// Render, Heroku, Nginx, etc. — without this all users share one IP)
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://ac-commerce.onrender.com'
    : 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Security middleware ──────────────────────────────────────────────────────
// HTTP security headers
// CSP is disabled here because React uses inline scripts and loads PayPal/
// Google SDKs from external domains. Enable and tune it once you have a
// fixed list of trusted origins.
// COOP is relaxed to `same-origin-allow-popups` so the Google OAuth popup
// can communicate back to the opener window when it closes.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

// NoSQL injection prevention — strips $ and . keys from req.body only
// (express-mongo-sanitize is incompatible with Express 5 read-only req.query)
const sanitizeBody = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeBody(obj[key]);
      }
    }
  }
};
app.use((req, _res, next) => {
  if (req.body) sanitizeBody(req.body);
  next();
});

// General API rate limit: Higher limit for dev, stricter for production
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 1000 for dev, 200 for prod
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  // Skip rate limiting for localhost in development
  skip: (req) => process.env.NODE_ENV !== 'production' && 
                  (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
});
app.use('/api', apiLimiter);

// Stricter limit on auth endpoints: 20 req / 15 min per IP (production), 100 for dev
// Only counts failed attempts (skipSuccessfulRequests) so legitimate logins
// don't burn through the budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts, please try again later.' },
});
app.use('/api/users/signin', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forget-password', authLimiter);

// Extra-strict limit dedicated to admin login: 5 failed attempts / 15 min per IP.
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many admin login attempts, please try again later.' },
});
app.use('/api/users/admin/signin', adminAuthLimiter);
// ─────────────────────────────────────────────────────────────────────────────





app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true }));


const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.use('/api/products/image-search', upload.single('image'));

app.get("/api/keys/paypal", isAuth, (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});

app.get("/api/keys/google", isAuth, (req, res) => {
  res.send({ key: process.env.GOOGLE_API_KEY || "" });
});

if (process.env.NODE_ENV !== 'production') {
  const { default: seedRouter } = await import('./routes/seedRoutes.js');
  app.use('/api/seed', seedRouter);
}

app.use("/api/upload", uploadRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/sellers', sellerRouter);
app.use('/api/contact', contactRouter);
app.use('/api/service-providers', serviceProviderRouter);
app.use('/api/blogs', blogRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api', annotationRoutes);
app.use('/api/engineer-annotations', engineerAnnotationRoutes);
app.use('/api/browsing-history', browsingHistoryRouter);
app.use('/api/user-reviews', userReviewsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/roi-calculations', roiRouter);
app.use('/api/demo-requests', demoRequestRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/hvac-zones', hvacZoneRouter);



const __dirname = path.resolve();
// Serve uploaded/static images first, before the SPA catch-all
app.use('/images', express.static(path.join(__dirname, 'public/images')));
// Serve React SPA — must come AFTER all API routes
app.use(express.static(path.join(__dirname, '/frontend/build')));
app.get('/{*path}', (req, res) =>
    res.sendFile(path.join(__dirname, '/frontend/build/index.html'))
);
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

start();

process.on('SIGINT', () => {
  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    console.log('Server gracefully shut down');
    process.exit(0);
  });
});