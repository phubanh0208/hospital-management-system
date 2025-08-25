import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import eventRoutes from './routes/eventRoutes';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
  filterDataByRole,
  checkWritePermissions,
  checkDoctorOwnership
} from './middleware/auth';

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
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID', 'X-User-Role', 'X-Request-ID']
}));

// Compression middleware
app.use(compression());

// Request ID + logging
morgan.token('id', (req: any, res: any) => res.locals.requestId || '');
app.use((req: any, res: any, next: any) => {
  const incoming = req.headers['x-request-id'];
  const requestId = (typeof incoming === 'string' && incoming) ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});
app.use(morgan(':id :remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// API DOCS (Swagger UI)
// ======================
const apiDocsEnabled = (process.env.API_DOCS_ENABLED || '').toLowerCase() === 'true';
const apiDocsPath = process.env.API_DOCS_PATH || '/api-docs';

// Minimal OpenAPI spec to document root and health endpoints; extend later as needed
const openapiSpec = {
  openapi: '3.0.1',
  info: {
    title: 'Hospital Management API Gateway',
    version: '2.2.0',
    description: 'Enhanced Gateway with complete API coverage for Hospital Management microservices',
  },
  servers: [
    { url: `http://localhost:${PORT}` }
  ],
  paths: {
    '/': {
      get: {
        summary: 'Gateway info',
        responses: {
          '200': { description: 'Information about the gateway and available endpoints' }
        }
      }
    },
    '/health': {
      get: {
        summary: 'System health',
        responses: {
          '200': { description: 'All services healthy' },
          '207': { description: 'Partial degradation' },
          '503': { description: 'Health check failed' }
        }
      }
    }
  }
} as const;

if (apiDocsEnabled) {
  app.use(apiDocsPath, swaggerUi.serve, swaggerUi.setup(openapiSpec as any));
  app.get(`${apiDocsPath}.json`, (_req, res) => res.json(openapiSpec));
}

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
// UPSTREAM SETTINGS & FETCH RETRY HELPER
// ======================
const UPSTREAM_TIMEOUT_MS = Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000);
const GATEWAY_RETRIES = Number(process.env.GATEWAY_RETRIES || 2);
const GATEWAY_RETRY_BACKOFF_MS = Number(process.env.GATEWAY_RETRY_BACKOFF_MS || 250);

async function fetchWithRetry(url: string, init: RequestInit & { idempotent?: boolean } = {}, requestId?: string): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const idempotent = init.idempotent ?? (method === 'GET' || method === 'HEAD');
  const baseHeaders = (init.headers || {}) as Record<string, string>;
  const headers = { ...baseHeaders, 'X-Request-ID': requestId || '' };

  for (let attempt = 0; attempt <= (idempotent ? GATEWAY_RETRIES : 0); attempt++) {
    try {
      const resp = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
      if (idempotent && resp.status >= 500 && attempt < GATEWAY_RETRIES) {
        await new Promise(r => setTimeout(r, GATEWAY_RETRY_BACKOFF_MS * Math.pow(2, attempt)));
        continue;
      }
      return resp;
    } catch (e) {
      if (idempotent && attempt < GATEWAY_RETRIES) {
        await new Promise(r => setTimeout(r, GATEWAY_RETRY_BACKOFF_MS * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  // Fallback (should not reach)
  return fetch(url, init);
}

// ======================
// WS PROXY (Notifications)
// ======================
const notificationsWsPath = '/ws/notifications';
const wsProxy = createProxyMiddleware(notificationsWsPath, {
  target: getServiceUrl('notification'),
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/ws/notifications': '/' },
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});
app.use(notificationsWsPath, wsProxy);

// ======================
// ROUTES
// ======================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hospital Management System API Gateway',
    version: '2.2.0',
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
      users: '/api/users/* (user management - admin only)',
      doctors: '/api/doctors/* (doctor profiles, specializations, ratings, search)',
      patients: '/api/patients/* (CRUD operations, medical history, visit summary)',
      appointments: '/api/appointments/* (booking, management, conflicts, confirm, complete, doctor schedule)',
      appointmentSlots: '/api/appointment-slots/* (slot management, availability)',
      doctorAvailability: '/api/doctor-availability/* (doctor schedule management)',
      prescriptions: '/api/prescriptions/* (medication management, status updates)',
      medications: '/api/medications/* (drug catalog, search, CRUD operations)',
      notifications: '/api/notifications/* (messaging system, async notifications, queue management)',
      analytics: '/api/analytics/* (reports, statistics, dashboard, patient/prescription analytics)'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const services = ['auth', 'patient', 'appointment', 'prescription', 'notification', 'analytics'];
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetchWithRetry(`${getServiceUrl(service)}/health`, {
            method: 'GET',
            idempotent: true
          }, res.locals.requestId);
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
      version: '2.2.0',
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

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${getServiceUrl('auth')}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check if response is ok and content-type is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Auth Service returned non-JSON response:', text);
      throw new Error('Auth service returned invalid response');
    }

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
    console.log('🔐 Reset Password Request');
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
      message: 'Internal server error',
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
// USER MANAGEMENT ROUTES (Admin Only)
// ======================

// Get all users
app.get('/api/users', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👥 Get All Users Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('auth')}/api/users${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`👤 Get User ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('auth')}/api/users/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create user
app.post('/api/users', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create User Request');
    const response = await fetch(`${getServiceUrl('auth')}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update user
app.put('/api/users/:id', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update User ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('auth')}/api/users/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete user
app.delete('/api/users/:id', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete User ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('auth')}/api/users/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Activate user
app.post('/api/users/:id/activate', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✅ Activate User ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('auth')}/api/users/${req.params.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Activate User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Deactivate user
app.post('/api/users/:id/deactivate', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`❌ Deactivate User ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('auth')}/api/users/${req.params.id}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Deactivate User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// DOCTOR ROUTES (Auth Service & Appointment Service)
// ======================

// Get all doctors (public - from auth service)
app.get('/api/doctors', async (req, res) => {
  try {
    console.log('👨‍⚕️ Get All Doctors Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('auth')}/api/doctors${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get All Doctors Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor profile by user ID (public - from auth service)
app.get('/api/doctors/profile/:userId', async (req, res) => {
  try {
    console.log(`👨‍⚕️ Get Doctor Profile ${req.params.userId} Request`);
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/profile/${req.params.userId}`, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor by profile ID (public - from auth service)
app.get('/api/doctors/:id', async (req, res) => {
  try {
    console.log(`👨‍⚕️ Get Doctor ${req.params.id} Request`);
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/${req.params.id}`, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get my doctor profile (doctor only - from auth service)
app.get('/api/doctors/my/profile', authenticate, authorize('doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👨‍⚕️ Get My Doctor Profile Request');
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/my/profile`, {
      method: 'GET',
      headers: { 'Authorization': req.headers.authorization || '' },
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get My Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create my doctor profile (doctor only - from auth service)
app.post('/api/doctors/my/profile', authenticate, authorize('doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create My Doctor Profile Request');
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/my/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create My Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update my doctor profile (doctor only - from auth service)
app.put('/api/doctors/my/profile', authenticate, authorize('doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('✏️ Update My Doctor Profile Request');
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/my/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update My Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin create doctor profile (admin only - from auth service)
app.post('/api/doctors/profile', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Admin Create Doctor Profile Request');
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Admin Create Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin update doctor profile (admin/doctor - from auth service)
app.put('/api/doctors/profile/:userId', authenticate, authorize('admin', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Doctor Profile ${req.params.userId} Request`);
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/profile/${req.params.userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin delete doctor profile (admin only - from auth service)
app.delete('/api/doctors/profile/:userId', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Doctor Profile ${req.params.userId} Request`);
    const response = await fetchWithRetry(`${getServiceUrl('auth')}/api/doctors/profile/${req.params.userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' }
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Doctor Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// PATIENT SERVICE ROUTES
// ======================

// Get all patients - Admin/Staff see all, Doctor sees assigned patients
app.get('/api/patients', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👥 Get Patients Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('patient')}/api/patients${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/patients/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`👤 Get Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.post('/api/patients', authenticate, authorize('admin', 'staff', 'doctor'), checkWritePermissions('patient'), async (req: AuthenticatedRequest, res) => {
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
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.put('/api/patients/:id', authenticate, authorize('admin', 'staff', 'doctor'), checkWritePermissions('patient'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.delete('/api/patients/:id', authenticate, authorize('admin'), checkWritePermissions('patient'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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

// Get patient by code
app.get('/api/patients/code/:code', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔍 Get Patient by Code ${req.params.code} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/code/${req.params.code}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Patient by Code Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update visit summary for patient
app.post('/api/patients/:id/update-visit-summary', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔄 Update Visit Summary for Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}/update-visit-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Visit Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update all visit summaries
app.post('/api/patients/update-all-visit-summaries', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🔄 Update All Visit Summaries Request');
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/update-all-visit-summaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 30000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update All Visit Summaries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get patient medical history
app.get('/api/patients/:id/medical-history', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📋 Get Medical History for Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}/medical-history`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Medical History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Add medical history
app.post('/api/patients/:id/medical-history', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`➕ Add Medical History for Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}/medical-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Add Medical History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update medical history
app.put('/api/patients/medical-history/:historyId', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Medical History ${req.params.historyId} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/medical-history/${req.params.historyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Medical History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete medical history
app.delete('/api/patients/medical-history/:historyId', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Medical History ${req.params.historyId} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/medical-history/${req.params.historyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Medical History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Patient service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get visit summary
app.get('/api/patients/:id/visit-summary', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📊 Get Visit Summary for Patient ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('patient')}/api/patients/${req.params.id}/visit-summary`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Visit Summary Error:', error);
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

// Get all appointments - Users see filtered data based on role
app.get('/api/appointments', authenticate, authorize('admin', 'staff', 'doctor', 'nurse', 'patient'), filterDataByRole(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📅 Get Appointments Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/appointments${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/appointments/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📅 Get Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.post('/api/appointments', authenticate, authorize('admin', 'staff', 'doctor'), checkWritePermissions('appointment'), checkDoctorOwnership(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Appointment Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.put('/api/appointments/:id', authenticate, authorize('admin', 'staff', 'doctor'), checkWritePermissions('appointment'), checkDoctorOwnership(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.delete('/api/appointments/:id', authenticate, authorize('admin', 'staff', 'patient'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`❌ Cancel Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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

// Get appointment conflicts
app.get('/api/appointments/conflicts', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('⚠️ Get Appointment Conflicts Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/appointments/conflicts${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointment Conflicts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get appointment by number
app.get('/api/appointments/number/:appointmentNumber', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔍 Get Appointment by Number ${req.params.appointmentNumber} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/number/${req.params.appointmentNumber}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointment by Number Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Confirm appointment
app.put('/api/appointments/:id/confirm', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✅ Confirm Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}/confirm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Confirm Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Complete appointment
app.put('/api/appointments/:id/complete', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🏁 Complete Appointment ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointments/${req.params.id}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Complete Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor schedule
app.get('/api/appointments/doctor/:doctorId/schedule', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`👨‍⚕️ Get Doctor ${req.params.doctorId} Schedule Request`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/appointments/doctor/${req.params.doctorId}/schedule${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Schedule Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get patient appointments
app.get('/api/appointments/patient/:patientId', authenticate, authorize('admin', 'staff', 'doctor', 'nurse', 'patient'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`👤 Get Patient ${req.params.patientId} Appointments Request`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/appointments/patient/${req.params.patientId}${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Patient Appointments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// APPOINTMENT SLOTS ROUTES
// ======================

// Get all appointment slots
app.get('/api/appointment-slots', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🕐 Get Appointment Slots Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/appointment-slots${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Appointment Slots Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create appointment slot
app.post('/api/appointment-slots', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Appointment Slot Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointment-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Appointment Slot Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update appointment slot
app.put('/api/appointment-slots/:id', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Appointment Slot ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointment-slots/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Appointment Slot Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete appointment slot
app.delete('/api/appointment-slots/:id', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Appointment Slot ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointment-slots/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Appointment Slot Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get available slots
app.get('/api/appointment-slots/available/:doctorId/:date', authenticate, authorize('admin', 'staff', 'doctor', 'nurse', 'patient'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📅 Get Available Slots for Doctor ${req.params.doctorId} on ${req.params.date} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointment-slots/available/${req.params.doctorId}/${req.params.date}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Available Slots Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Generate slots for doctor
app.post('/api/appointment-slots/generate', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🔄 Generate Appointment Slots Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/appointment-slots/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Generate Appointment Slots Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// DOCTOR AVAILABILITY ROUTES
// ======================

// Get doctor availability
app.get('/api/doctor-availability', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👨‍⚕️ Get Doctor Availability Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctor-availability${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Availability Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create doctor availability
app.post('/api/doctor-availability', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Doctor Availability Request');
    const response = await fetch(`${getServiceUrl('appointment')}/api/doctor-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Doctor Availability Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update doctor availability
app.put('/api/doctor-availability/:id', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Doctor Availability ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/doctor-availability/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Doctor Availability Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete doctor availability
app.delete('/api/doctor-availability/:id', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Doctor Availability ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/doctor-availability/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Doctor Availability Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor availability by day
app.get('/api/doctor-availability/doctor/:doctorId/day/:dayOfWeek', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📅 Get Doctor ${req.params.doctorId} Availability for ${req.params.dayOfWeek} Request`);
    const response = await fetch(`${getServiceUrl('appointment')}/api/doctor-availability/doctor/${req.params.doctorId}/day/${req.params.dayOfWeek}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Availability by Day Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// DOCTOR SEARCH ROUTES (Appointment Service)
// ======================

// Get available doctors for appointments (public - from appointment service)
app.get('/api/doctors/available', async (req, res) => {
  try {
    console.log('🔍 Get Available Doctors Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctors/available${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Available Doctors Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get top rated doctors (public - from appointment service)
app.get('/api/doctors/top-rated', async (req, res) => {
  try {
    console.log('⭐ Get Top Rated Doctors Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctors/top-rated${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Top Rated Doctors Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Search doctors (public - from appointment service)
app.get('/api/doctors/search', async (req, res) => {
  try {
    console.log('🔍 Search Doctors Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctors/search${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Search Doctors Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctors by fee range (public - from appointment service)
app.get('/api/doctors/fee-range', async (req, res) => {
  try {
    console.log('💰 Get Doctors by Fee Range Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctors/fee-range${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctors by Fee Range Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctors by specialization (public - from appointment service)
app.get('/api/doctors/specialization/:specialization', async (req, res) => {
  try {
    console.log(`🏥 Get Doctors by Specialization ${req.params.specialization} Request`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('appointment')}/api/doctors/specialization/${req.params.specialization}${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctors by Specialization Error:', error);
    res.status(500).json({
      success: false,
      message: 'Appointment service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor by user ID (public - from appointment service)
app.get('/api/doctors/user/:userId', async (req, res) => {
  try {
    console.log(`👨‍⚕️ Get Doctor by User ID ${req.params.userId} Request (Appointment Service)`);
    const response = await fetchWithRetry(`${getServiceUrl('appointment')}/api/doctors/user/${req.params.userId}`, {
      method: 'GET',
      idempotent: true
    }, res.locals.requestId);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor by User ID Error:', error);
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

// Get all prescriptions - Users see filtered data based on role
app.get('/api/prescriptions', authenticate, authorize('admin', 'staff', 'doctor', 'nurse', 'patient'), filterDataByRole(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('💊 Get Prescriptions Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('prescription')}/api/prescriptions${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/prescriptions/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`💊 Get Prescription ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.post('/api/prescriptions', authenticate, authorize('admin', 'doctor'), checkWritePermissions('prescription'), checkDoctorOwnership(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Prescription Request');
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.put('/api/prescriptions/:id', authenticate, authorize('admin', 'doctor'), checkWritePermissions('prescription'), checkDoctorOwnership(), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Prescription ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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

// Get prescription by number
app.get('/api/prescriptions/number/:prescriptionNumber', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔍 Get Prescription by Number ${req.params.prescriptionNumber} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/prescriptions/number/${req.params.prescriptionNumber}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Prescription by Number Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// MEDICATION MANAGEMENT ROUTES
// ======================

// Get medications
app.get('/api/medications', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('💉 Get Medications Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${getServiceUrl('prescription')}/api/medications${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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

// Search medications
app.get('/api/medications/search/:searchTerm', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔍 Search Medications: ${req.params.searchTerm} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications/search/${req.params.searchTerm}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Search Medications Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get medication by code
app.get('/api/medications/code/:medicationCode', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🔍 Get Medication by Code ${req.params.medicationCode} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications/code/${req.params.medicationCode}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Medication by Code Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get medication by ID
app.get('/api/medications/:id', authenticate, authorize('admin', 'staff', 'doctor', 'nurse'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`💊 Get Medication ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications/${req.params.id}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Medication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Create medication
app.post('/api/medications', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('➕ Create Medication Request');
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Create Medication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Update medication
app.put('/api/medications/:id', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`✏️ Update Medication ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Update Medication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Prescription service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete medication
app.delete('/api/medications/:id', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Medication ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('prescription')}/api/medications/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Medication Error:', error);
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
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.post('/api/notifications', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📤 Send Notification Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.post('/api/notifications/send-appointment-reminder', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📅 Send Appointment Reminder Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/send-appointment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.post('/api/notifications/send-prescription-ready', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('💊 Send Prescription Ready Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/send-prescription-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.put('/api/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📖 Mark Notification ${req.params.id} as Read Request`);
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/${req.params.id}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
app.get('/api/notifications/unread-count', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🔢 Get Unread Count Request');
    const params = new URLSearchParams(req.query as Record<string, string>);
    if (!params.get('userId')) {
      params.set('userId', req.user!.id);
    }
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/unread-count?${params.toString()}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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

// Delete notification
app.delete('/api/notifications/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`🗑️ Delete Notification ${req.params.id} Request`);
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Delete Notification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Cleanup expired notifications
app.post('/api/notifications/cleanup-expired', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🧹 Cleanup Expired Notifications Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/cleanup-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Cleanup Expired Notifications Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// ASYNC NOTIFICATION ROUTES
// ======================

// Send async notification
app.post('/api/notifications/async', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🚀 Send Async Notification Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Send Async Notification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Queue appointment reminder
app.post('/api/notifications/queue/appointment-reminder', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📅 Queue Appointment Reminder Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/queue/appointment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Queue Appointment Reminder Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Queue prescription ready notification
app.post('/api/notifications/queue/prescription-ready', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('💊 Queue Prescription Ready Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/queue/prescription-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Queue Prescription Ready Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Queue system alert
app.post('/api/notifications/queue/system-alert', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('⚠️ Queue System Alert Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/queue/system-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Queue System Alert Error:', error);
    res.status(500).json({
      success: false,
      message: 'Notification service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Queue bulk notifications
app.post('/api/notifications/queue/bulk', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📦 Queue Bulk Notifications Request');
    const response = await fetch(`${getServiceUrl('notification')}/api/notifications/queue/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Queue Bulk Notifications Error:', error);
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
app.get('/api/analytics/patients/monthly', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📊 Get Patient Monthly Stats Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/patients/monthly?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/analytics/prescriptions/reports', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('💊 Get Prescription Reports Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/prescriptions/reports?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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

// Get doctor performance - Doctors can see their own performance
app.get('/api/analytics/doctors/performance', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👨‍⚕️ Get Doctor Performance Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/doctors/performance?${queryString}`, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'X-User-ID': req.user?.id || '',
        'X-User-Role': req.user?.role || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/analytics/system/metrics', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('⚙️ Get System Metrics Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/system/metrics?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/analytics/appointments/stats', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📅 Get Appointment Stats Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/appointments/stats?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.get('/api/analytics/dashboard', authenticate, authorize('admin', 'staff'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Get Dashboard Summary Request');
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/dashboard`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
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
app.post('/api/analytics/refresh', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🔄 Refresh Analytics Views Request');
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
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
// DOCTOR-SPECIFIC ANALYTICS
// ======================

// Get doctor dashboard - Doctors can only see their own dashboard
app.get('/api/analytics/dashboard/doctor/:doctorId', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { doctorId } = req.params;

    // Doctors can only access their own dashboard
    if (req.user?.role === 'doctor' && req.user?.id !== doctorId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Doctors can only view their own analytics.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`👨‍⚕️ Get Doctor Dashboard Request for Doctor: ${doctorId}`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/dashboard/doctor/${doctorId}?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor patients analytics
app.get('/api/analytics/doctors/:doctorId/patients', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { doctorId } = req.params;

    // Doctors can only access their own patients
    if (req.user?.role === 'doctor' && req.user?.id !== doctorId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Doctors can only view their own patients.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`👥 Get Doctor Patients Request for Doctor: ${doctorId}`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/doctors/${doctorId}/patients?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Patients Error:', error);
    res.status(500).json({
      success: false,
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get doctor appointment trends
app.get('/api/analytics/doctors/:doctorId/appointments/trends', authenticate, authorize('admin', 'staff', 'doctor'), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { doctorId } = req.params;

    // Doctors can only access their own trends
    if (req.user?.role === 'doctor' && req.user?.id !== doctorId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Doctors can only view their own appointment trends.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`📈 Get Doctor Appointment Trends Request for Doctor: ${doctorId}`);
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/doctors/${doctorId}/appointments/trends?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Doctor Appointment Trends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Analytics service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// ADMIN-SPECIFIC ANALYTICS
// ======================

// Get admin dashboard
app.get('/api/analytics/dashboard/admin', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👑 Get Admin Dashboard Request');
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const response = await fetch(`${getServiceUrl('analytics')}/api/analytics/dashboard/admin?${queryString}`, {
      headers: { 'Authorization': req.headers.authorization || '' },
      signal: AbortSignal.timeout(Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 5000))
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Get Admin Dashboard Error:', error);
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
      documentation: 'API Gateway v2.1.0',
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

const server = app.listen(PORT, () => {

// ======================
// ANALYTICS SERVICE ROUTES
// ======================

// Proxy all analytics requests
app.use('/api/analytics', authenticate, createProxyMiddleware({
  target: getServiceUrl('analytics'),
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '/api/analytics',
  },
  onProxyReq: (proxyReq, req: any, res) => {
    proxyReq.setHeader('X-User-ID', req.user?.id || '');
    proxyReq.setHeader('X-User-Role', req.user?.role || '');
  }
}));

// Proxy event tracking requests (no auth needed for this endpoint)
app.use('/api/events', createProxyMiddleware({
  target: getServiceUrl('analytics'),
  changeOrigin: true,
  pathRewrite: {
    '^/api/events': '/api/events',
  },
}));

  console.log(`🚀 API Gateway v2.2.0 started on port ${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  if (apiDocsEnabled) {
    console.log(`📘 API Docs (Swagger UI): http://localhost:${PORT}${apiDocsPath}`);
    console.log(`🧾 API Docs JSON: http://localhost:${PORT}${apiDocsPath}.json`);
  }
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/*`);
  console.log(`👥 Users: http://localhost:${PORT}/api/users/* (Admin only)`);
  console.log(`🏥 Patients: http://localhost:${PORT}/api/patients/*`);
  console.log(`📅 Appointments: http://localhost:${PORT}/api/appointments/*`);
  console.log(`🕐 Appointment Slots: http://localhost:${PORT}/api/appointment-slots/*`);
  console.log(`👨‍⚕️ Doctor Availability: http://localhost:${PORT}/api/doctor-availability/*`);
  console.log(`💊 Prescriptions: http://localhost:${PORT}/api/prescriptions/*`);
  console.log(`💉 Medications: http://localhost:${PORT}/api/medications/*`);
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications/*`);
  console.log(`🚀 Async Notifications: http://localhost:${PORT}/api/notifications/async`);
  console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics/*`);
  console.log(`📡 WS Notifications Proxy: ws://localhost:${PORT}${notificationsWsPath}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✨ Complete Hospital Management API Gateway v2.2.0 Ready with Enhanced APIs!`);
});

// Handle WebSocket upgrade for proxied path(s)
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith(notificationsWsPath)) {
    (wsProxy as any).upgrade?.(req, socket, head);
  } else {
    socket.destroy();
  }
});

export default app;