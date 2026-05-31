import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalLimiter, authLimiter, passwordResetLimiter, otpResendLimiter } from './middleware/rateLimit.middleware';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import streakRoutes from './routes/streak.routes';

const app = express();

// Trust reverse proxy (Render, Heroku, etc.) to get correct client IPs for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
}));

// CORS configuration
app.use(cors({ 
  origin: config.corsOrigin.split(',').map(o => o.trim()), 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request body size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// General rate limiting
app.use(generalLimiter);

// Request logging in production
if (config.nodeEnv === 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    } 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/streaks', streakRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
