import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'test' ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication requests, please try again later.',
  },
});

app.use('/api/auth', authLimiter);

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student Management System API',
    health: '/api/health',
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
