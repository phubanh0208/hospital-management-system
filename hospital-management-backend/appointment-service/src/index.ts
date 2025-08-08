import 'dotenv/config';
import express from 'express';
import { 
  logger, 
  errorHandler, 
  requestLogger,
  getEnvVar 
} from '@hospital/shared';
import appointmentRoutes from './routes/appointments';
import doctorAvailabilityRoutes from './routes/doctorAvailability';
import appointmentSlotsRoutes from './routes/appointmentSlots';

const app = express();
const PORT = parseInt(getEnvVar('PORT', '3003'));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'appointment-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor-availability', doctorAvailabilityRoutes);
app.use('/api/appointment-slots', appointmentSlotsRoutes);

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
  logger.info(`Appointment Service is running on port ${PORT}`, {
    service: 'appointment-service'
  });
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`, {
    service: 'appointment-service'
  });
});

export default app;
