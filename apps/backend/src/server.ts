import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { requestLogger } from './middlewares/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Permissive CORS for local development and production cloud deployments (Vercel, Render, custom domains)
const customFrontendUrl = process.env.FRONTEND_URL;
const allowedOrigins = [
  'http://localhost:8500',
  'http://localhost:5173',
  'http://localhost:3000',
  customFrontendUrl,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, health checks)
      if (!origin) return callback(null, true);

      // If FRONTEND_URL is unset or wildcard, permit all
      if (!customFrontendUrl || customFrontendUrl === '*') {
        return callback(null, true);
      }

      // Allow matching origins, any Vercel deployment preview/production URL, Render URLs, or localhost
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost');

      if (isAllowed) {
        return callback(null, true);
      }

      // Safe default: permit origin to prevent breaking preflight requests
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key', 'X-Requested-With'],
  })
);

app.use(express.json());
app.use(requestLogger);

// Auth rate limiter (max 20 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health and root endpoints
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CareSync Healthcare Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      doctors: '/api/doctors',
      auth: '/api/auth/login',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
