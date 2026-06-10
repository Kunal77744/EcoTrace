import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import footprintRoutes from './routes/footprint.routes';
import { rateLimiter } from './middlewares/rateLimiter';

dotenv.config();

const app = express();

// Security and middleware configuration
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply rate limiting to all API endpoints
app.use('/api', rateLimiter);

// API route mappings
app.use('/api/auth', authRoutes);
app.use('/api/footprint', footprintRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Carbon Footprint Sustainability Backend is running and healthy.',
  });
});

// Capture non-matching routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error-Handling Middleware (Must be attached last)
app.use(errorHandler);

// Run the server listener only when not running in testing mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server]: Started successfully in ${process.env.NODE_ENV || 'development'} mode.`);
      console.log(`[Server]: Listening on endpoint http://localhost:${PORT}`);
    });
  });
}

export default app;
