import 'dotenv/config';
import express from 'express';
import { 
  logger, 
  errorHandler, 
  requestLogger,
  getEnvVar 
} from '@hospital/shared';
import prescriptionRoutes from './routes/prescriptions';
import medicationRoutes from './routes/medications';

const app = express();
const PORT = parseInt(getEnvVar('PORT', '3004'));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'prescription-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medications', medicationRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`Prescription Service is running on port ${PORT}`, {
    service: 'prescription-service'
  });
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`, {
    service: 'prescription-service'
  });
});

export default app;
