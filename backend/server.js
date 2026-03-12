import express from 'express';
import dotenv from 'dotenv';
import mongoose from "mongoose";
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import seedRouter from './routes/seedRoutes.js';
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
import { isAuth } from './utils.js';
import path from "path";
import cors from 'cors';
import bodyParser from 'body-parser';
import Notification from './models/notificationModel.js';
import { startPaymentReminderJob } from './utils/paymentReminderJob.js';


dotenv.config();

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const notifications = await Notification.find();
    console.log(notifications);

    // Start scheduled jobs
    startPaymentReminderJob();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}

start();

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
app.use(helmet({
  contentSecurityPolicy: false,
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

// General API rate limit: 200 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Stricter limit on auth endpoints: 20 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});
app.use('/api/users/signin', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forget-password', authLimiter);
// ─────────────────────────────────────────────────────────────────────────────





app.use(express.json({ limit: '10mb' }));

app.use(bodyParser.json({ limit: '10mb' }));

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

app.use('/api/seed', seedRouter);

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



const __dirname = path.resolve();
// app.use(express.static(path.join(__dirname, "/frontend/build")));
// app.get("*", (req, res) =>
//     res.sendFile(path.join(__dirname, "/frontend/build/index.html"))
// );

app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.get('/', (req, res) => {
  res.send('Hello, World!');
});
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 5020;
const server = app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server gracefully shut down');
    process.exit(0);
  });
});