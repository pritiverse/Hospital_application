import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { requestLogger } from './middlewares/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Restrict CORS to frontend origin
const allowedOrigins = [
  'http://localhost:8500',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
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
