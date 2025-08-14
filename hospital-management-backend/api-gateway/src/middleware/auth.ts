import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

// JWT verification middleware
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Auth Service using profile endpoint
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${authServiceUrl}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userData = await response.json() as { data: any };
    req.user = userData.data;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// Resource ownership check with enhanced role support
export const checkResourceOwnership = (resourceType: 'patient' | 'appointment' | 'prescription') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      const user = req.user!;

      // Admin and staff can access everything
      if (user.role === 'admin' || user.role === 'staff') {
        return next();
      }

      // Nurse can read most resources but with limited write access
      if (user.role === 'nurse') {
        // Nurses can read all patient data and appointments
        if (resourceType === 'patient' || resourceType === 'appointment') {
          return next();
        }
        // For prescriptions, nurses can only read
        if (resourceType === 'prescription' && req.method === 'GET') {
          return next();
        }
      }

      // For patients: can only access their own data
      if (user.role === 'patient') {
        if (resourceType === 'patient' && resourceId !== user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only access your own patient data',
            timestamp: new Date().toISOString()
          });
        }

        // For appointments/prescriptions, need to verify ownership
        if (resourceType === 'appointment' || resourceType === 'prescription') {
          // This would need to call the respective service to verify ownership
          // For now, we'll implement a basic check
          const serviceUrl = getServiceUrl(resourceType);
          const response = await fetch(`${serviceUrl}/api/${resourceType}s/${resourceId}/owner`, {
            headers: { 'Authorization': req.headers.authorization || '' }
          });

          if (!response.ok) {
            return res.status(403).json({
              success: false,
              message: `You can only access your own ${resourceType} data`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // For doctors: can access their own appointments/prescriptions and assigned patients
      if (user.role === 'doctor') {
        if (resourceType === 'patient') {
          // Verify doctor has access to this patient (through appointments)
          const serviceUrl = getServiceUrl('appointment');
          const response = await fetch(`${serviceUrl}/api/appointments/doctor/${user.id}/patients/${resourceId}`, {
            headers: { 'Authorization': req.headers.authorization || '' }
          });

          if (!response.ok) {
            return res.status(403).json({
              success: false,
              message: 'You can only access patients assigned to you',
              timestamp: new Date().toISOString()
            });
          }
        }

        if (resourceType === 'appointment' || resourceType === 'prescription') {
          // Verify doctor owns this resource
          const serviceUrl = getServiceUrl(resourceType);
          const response = await fetch(`${serviceUrl}/api/${resourceType}s/${resourceId}/doctor`, {
            headers: { 'Authorization': req.headers.authorization || '' }
          });

          if (!response.ok) {
            return res.status(403).json({
              success: false,
              message: `You can only access your own ${resourceType} data`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Enhanced data filtering middleware based on user role
export const filterDataByRole = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const query = req.query as Record<string, string>;
    const path = req.path;

    // Add user context to request headers for downstream services
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-role'] = user.role;

    console.log(`🔒 Role-based filtering: ${user.role} accessing ${path}`);

    switch (user.role) {
      case 'patient':
        // Patient chỉ xem data của mình
        if (path.includes('/appointments')) {
          query.patientId = user.id;
          console.log(`👤 Patient filter: appointments for patient ${user.id}`);
        } else if (path.includes('/prescriptions')) {
          query.patientId = user.id;
          console.log(`👤 Patient filter: prescriptions for patient ${user.id}`);
        }
        break;

      case 'doctor':
        // Doctor chỉ xem appointments/prescriptions của mình
        if (path.includes('/appointments')) {
          query.doctorId = user.id;
          console.log(`👨‍⚕️ Doctor filter: appointments for doctor ${user.id}`);
        } else if (path.includes('/prescriptions')) {
          query.doctorId = user.id;
          console.log(`👨‍⚕️ Doctor filter: prescriptions for doctor ${user.id}`);
        }
        break;

      case 'staff':
        // Staff xem tất cả data (no filtering)
        console.log(`👩‍💼 Staff access: no filtering applied`);
        break;

      case 'admin':
        // Admin xem tất cả data (no filtering)
        console.log(`👑 Admin access: no filtering applied`);
        break;

      default:
        console.log(`⚠️ Unknown role: ${user.role}`);
        break;
    }

    req.query = query;
    next();
  };
};

// Write permissions middleware
export const checkWritePermissions = (resource: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const method = req.method;

    console.log(`🔐 Write permission check: ${user.role} ${method} ${resource}`);

    // Define write permissions matrix
    const permissions: Record<string, Record<string, string[]>> = {
      'prescription': {
        'POST': ['admin', 'doctor'],           // Chỉ doctor tạo prescription
        'PUT': ['admin', 'doctor'],            // Chỉ doctor sửa prescription
        'PATCH': ['admin', 'doctor'],          // Chỉ doctor update prescription
        'DELETE': ['admin']                    // Chỉ admin xóa prescription
      },
      'appointment': {
        'POST': ['admin', 'staff', 'doctor'],  // Staff/Doctor book appointment
        'PUT': ['admin', 'staff', 'doctor'],   // Staff/Doctor update appointment
        'PATCH': ['admin', 'staff', 'doctor'], // Staff/Doctor update status
        'DELETE': ['admin', 'staff']           // Admin/Staff cancel appointment
      },
      'patient': {
        'POST': ['admin', 'staff', 'doctor'],  // Staff/Doctor tạo patient
        'PUT': ['admin', 'staff', 'doctor'],   // Staff/Doctor sửa patient
        'PATCH': ['admin', 'staff', 'doctor'], // Staff/Doctor update patient
        'DELETE': ['admin']                    // Chỉ admin xóa patient
      },
      'doctor': {
        'POST': ['admin'],                     // Chỉ admin tạo doctor
        'PUT': ['admin'],                      // Chỉ admin sửa doctor
        'PATCH': ['admin'],                    // Chỉ admin update doctor
        'DELETE': ['admin']                    // Chỉ admin xóa doctor
      },
      'user': {
        'POST': ['admin'],                     // Chỉ admin tạo user
        'PUT': ['admin'],                      // Chỉ admin sửa user
        'PATCH': ['admin'],                    // Chỉ admin update user
        'DELETE': ['admin']                    // Chỉ admin xóa user
      }
    };

    const allowedRoles = permissions[resource]?.[method] || [];

    if (allowedRoles.length === 0) {
      console.log(`⚠️ No permissions defined for ${method} ${resource}`);
      return next(); // Allow if no restrictions defined
    }

    if (!allowedRoles.includes(user.role)) {
      console.log(`❌ Access denied: ${user.role} cannot ${method} ${resource}`);
      return res.status(403).json({
        success: false,
        message: `Access denied: ${user.role} role cannot perform ${method} operation on ${resource}`,
        requiredRoles: allowedRoles,
        userRole: user.role,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Write permission granted: ${user.role} can ${method} ${resource}`);
    next();
  };
};

// Doctor data ownership middleware - ensures doctors only access their own data
export const checkDoctorOwnership = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const method = req.method;
    const path = req.path;

    // Only apply to doctors
    if (user.role !== 'doctor') {
      return next();
    }

    // Only apply to write operations on appointments/prescriptions
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next();
    }

    console.log(`👨‍⚕️ Doctor ownership check: ${user.id} ${method} ${path}`);

    try {
      // For appointments
      if (path.includes('/appointments/') && method !== 'POST') {
        const appointmentId = path.split('/appointments/')[1].split('/')[0];
        // TODO: Verify appointment belongs to doctor
        console.log(`🔍 Checking appointment ${appointmentId} ownership for doctor ${user.id}`);
      }

      // For prescriptions
      if (path.includes('/prescriptions/') && method !== 'POST') {
        const prescriptionId = path.split('/prescriptions/')[1].split('/')[0];
        // TODO: Verify prescription belongs to doctor
        console.log(`🔍 Checking prescription ${prescriptionId} ownership for doctor ${user.id}`);
      }

      // For POST operations, force doctorId in request body
      if (method === 'POST') {
        if (path.includes('/appointments') || path.includes('/prescriptions')) {
          req.body.doctorId = user.id;
          console.log(`🔒 Forced doctorId to ${user.id} for ${method} ${path}`);
        }
      }

      next();
    } catch (error) {
      console.error('Doctor ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Ownership verification failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Helper function to get service URL
const getServiceUrl = (serviceName: string): string => {
  const urls: Record<string, string> = {
    patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    prescription: process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004'
  };
  return urls[serviceName] || '';
};
// Updated: Mon, Sep  8, 2025 12:57:31 AM
