import { Request, Response, NextFunction } from 'express';

// Use Node's global fetch; declare type to satisfy TypeScript
declare const fetch: any;

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Lightweight auth middleware for notification-service
// Verifies JWT by calling Auth Service /api/auth/profile and attaches user to req
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

    const resp = await fetch(`${authServiceUrl}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!resp || !resp.ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    const data = await resp.json();
    // Expect structure { success: true, data: <user> }
    req.user = (data && data.data) ? data.data : data; // fallback in case structure differs
    return next();
  } catch (error) {
    console.error('Notification-service auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

