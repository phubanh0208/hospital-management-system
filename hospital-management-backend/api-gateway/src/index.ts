import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authenticate, AuthenticatedRequest } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE SETUP
// ======================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// SERVICE URLS
// ======================

const getServiceUrl = (serviceName: string): string => {
  const urls = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    prescription: process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006'
  };
  return urls[serviceName as keyof typeof urls] || '';
};

// ======================
// ROUTES
// ======================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hospital Management System API Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'Authentication and user management',
      patients: 'Patient information management',
      appointments: 'Appointment scheduling',
      prescriptions: 'Prescription and medication management',
      notifications: 'Notification and communication system',
      analytics: 'Reports, statistics and data analytics'
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth/* (login, register, refresh, profile, change-password, forgot-password, reset-password)',
      patients: '/api/patients/* (CRUD operations)',
      appointments: '/api/appointments/* (booking, management)',
      prescriptions: '/api/prescriptions/* (medication management, status updates)',
      medications: '/api/medications (drug catalog)',
      notifications: '/api/notifications/* (messaging system, appointment reminders, prescription alerts)',
      analytics: '/api/analytics/* (reports, statistics, dashboard, patient/prescription analytics)'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const services = ['auth', 'patient', 'appointment', 'prescription', 'notification'];
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetch(`${getServiceUrl(service)}/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          return {
            name: service,
            status: response.ok ? 'healthy' : 'unhealthy',
            url: getServiceUrl(service)
          };
        } catch (error) {
          return {
            name: service,
            status: 'unhealthy',
            url: getServiceUrl(service),
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const results = healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : { 
        name: 'unknown', 
        status: 'error', 
        error: 'Health check failed' 
      }
    );

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const overallStatus = healthyCount === services.length ? 'healthy' : 
                         healthyCount > 0 ? 'degraded' : 'unhealthy';

    res.status(overallStatus === 'healthy' ? 200 : 207).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: results
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// AUTH SERVICE ROUTES
// ======================

// Auth login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Auth Login Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Auth Login Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Auth Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Auth Register Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Auth Register Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Auth Register Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    console.log('🔄 Auth Refresh Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Auth Refresh Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Auth Refresh Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user profile
app.get('/api/auth/profile', async (req, res) => {
  try {
    console.log('👤 Get Profile Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log(`✅ Get Profile Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update user profile
app.put('/api/auth/profile', async (req, res) => {
  try {
    console.log('✏️ Update Profile Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Update Profile Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Change password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    console.log('🔐 Change Password Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Change Password Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Change Password Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    console.log('🔑 Forgot Password Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Forgot Password Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Forgot Password Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    console.log('🔄 Reset Password Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log(`✅ Reset Password Response: ${response.status}`);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Reset Password Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth health check
app.get('/api/auth/health', async (req, res) => {
  try {
    const response = await fetch(`${getServiceUrl('auth')}/health`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'auth-service',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// PATIENT SERVICE ROUTES
// ======================

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    console.log('👥 Get Patients Request');
    const response = await fetch(`${getServiceUrl('patient')}/api/patients`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Patients Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    console.log(`👤 Get Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Patient Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create patient
app.post('/api/patients', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Patient Request');
    const response = await fetch(`${getServiceUrl('patient')}/api/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Patient Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
  try {
    console.log(`✏️ Update Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Patient Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    console.log(`🗑️ Delete Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Patient Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// APPOINTMENT SERVICE ROUTES
// ======================

// Get all appointments
app.get('/api/appointments', async (req, res) => {
  try {
    console.log('📅 Get Appointments Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointments Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
  try {
    console.log(`📅 Get Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create appointment
app.post('/api/appointments', async (req, res) => {
  try {
    console.log('➕ Create Appointment Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Appointment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update appointment
app.put('/api/appointments/:id', async (req, res) => {
  try {
    console.log(`✏️ Update Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Appointment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Cancel appointment
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    console.log(`❌ Cancel Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Cancel Appointment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// PRESCRIPTION SERVICE ROUTES
// ======================

// Get all prescriptions
app.get('/api/prescriptions', async (req, res) => {
  try {
    console.log('💊 Get Prescriptions Request');
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Prescriptions Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get prescription by ID
app.get('/api/prescriptions/:id', async (req, res) => {
  try {
    console.log(`💊 Get Prescription ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Prescription Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create prescription
app.post('/api/prescriptions', async (req, res) => {
  try {
    console.log('➕ Create Prescription Request');
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Prescription Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update prescription status
app.put('/api/prescriptions/:id', async (req, res) => {
  try {
    console.log(`✏️ Update Prescription ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Prescription Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get medications
app.get('/api/medications', async (req, res) => {
  try {
    console.log('💉 Get Medications Request');
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Medications Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// NOTIFICATION SERVICE ROUTES
// ======================

// Get notifications
app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🔔 Get Notifications Request');
    const userId = req.user!.id;
    const queryString = new URLSearchParams({ 
      userId, 
      ...Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, String(v)]))
    });
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications?${queryString}`, {
      headers: { 
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Notifications Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Send notification
app.post('/api/notifications', async (req, res) => {
  try {
    console.log('📤 Send Notification Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Send Notification Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Send appointment reminder notification
app.post('/api/notifications/send-appointment-reminder', async (req, res) => {
  try {
    console.log('📅 Send Appointment Reminder Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/send-appointment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Send Appointment Reminder Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Send prescription ready notification
app.post('/api/notifications/send-prescription-ready', async (req, res) => {
  try {
    console.log('💊 Send Prescription Ready Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/send-prescription-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Send Prescription Ready Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    console.log(`📖 Mark Notification ${req.params.id} as Read Request`);
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/${req.params.id}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Mark Notification as Read Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    console.log('🔢 Get Unread Count Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/unread-count?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Unread Count Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// ANALYTICS ENDPOINTS
// ======================

// Get patient statistics by month
app.get('/api/analytics/patients/monthly', async (req, res) => {
  try {
    console.log('📊 Get Patient Monthly Stats Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/patients/monthly?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Patient Monthly Stats Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get prescription reports
app.get('/api/analytics/prescriptions/reports', async (req, res) => {
  try {
    console.log('💊 Get Prescription Reports Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/prescriptions/reports?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Prescription Reports Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor performance
app.get('/api/analytics/doctors/performance', async (req, res) => {
  try {
    console.log('👨‍⚕️ Get Doctor Performance Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/doctors/performance?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Performance Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get system metrics
app.get('/api/analytics/system/metrics', async (req, res) => {
  try {
    console.log('⚙️ Get System Metrics Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/system/metrics?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get System Metrics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get appointment statistics
app.get('/api/analytics/appointments/stats', async (req, res) => {
  try {
    console.log('📅 Get Appointment Stats Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/appointments/stats?${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointment Stats Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get dashboard summary
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    console.log('📋 Get Dashboard Summary Request');
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/dashboard`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Dashboard Summary Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Refresh analytics views
app.post('/api/analytics/refresh', async (req, res) => {
  try {
    console.log('🔄 Refresh Analytics Views Request');
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Refresh Analytics Views Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      documentation: 'API Gateway v2.0.0',
      health: '/health',
      auth: '/api/auth/*',
      patients: '/api/patients/*'
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Unhandled error:', error);
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
});

// ======================
// START SERVER
// ======================

app.listen(PORT, () => {
  console.log(`🚀 API Gateway v2.0.0 started on port ${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/*`);
  console.log(`👥 Patients: http://localhost:${PORT}/api/patients/*`);
  console.log(`📅 Appointments: http://localhost:${PORT}/api/appointments/*`);
  console.log(`💊 Prescriptions: http://localhost:${PORT}/api/prescriptions/*`);
  console.log(`💉 Medications: http://localhost:${PORT}/api/medications`);
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications/*`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✨ Complete Hospital Management API Gateway Ready!`);
});

export default app;