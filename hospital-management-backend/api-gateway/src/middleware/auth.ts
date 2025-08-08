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

// Resource ownership check
export const checkResourceOwnership = (resourceType: 'patient' | 'appointment' | 'prescription') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      const user = req.user!;

      // Admin can access everything
      if (user.role === 'admin') {
        return next();
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

      // For doctors: can access their own appointments/prescriptions
      if (user.role === 'doctor') {
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

// Helper function to get service URL
const getServiceUrl = (serviceName: string): string => {
  const urls: Record<string, string> = {
    patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    prescription: process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004'
  };
  return urls[serviceName] || '';
};
