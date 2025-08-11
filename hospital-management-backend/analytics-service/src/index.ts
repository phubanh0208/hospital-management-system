import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import analyticsRoutes from './routes/analyticsRoutes';
import eventRoutes from './routes/eventRoutes';
import healthRoutes from './routes/healthRoutes';

// Import database
import { testConnection } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Routes
app.use('/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/events', eventRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Hospital Analytics Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      patients_monthly: '/api/analytics/patients/monthly',
      prescription_reports: '/api/analytics/prescriptions/reports',
      doctor_performance: '/api/analytics/doctors/performance',
      system_metrics: '/api/analytics/system/metrics',
      appointment_stats: '/api/analytics/appointments/stats',
      dashboard: '/api/analytics/dashboard',
      refresh_views: '/api/analytics/refresh'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
const startServer = async () => {
  try {
        // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service v1.0.0 started on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Patient Stats: http://localhost:${PORT}/api/analytics/patients/monthly`);
      console.log(`💊 Prescription Reports: http://localhost:${PORT}/api/analytics/prescriptions/reports`);
      console.log(`👨‍⚕️ Doctor Performance: http://localhost:${PORT}/api/analytics/doctors/performance`);
      console.log(`📋 Dashboard: http://localhost:${PORT}/api/analytics/dashboard`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✨ Hospital Analytics Service Ready!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;

