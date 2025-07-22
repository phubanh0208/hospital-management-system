import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { createErrorResponse } from './utils';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(level, `${req.method} ${req.path} ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

// Global error handler
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    body: req.body
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const statusCode = error.statusCode || error.status || 500;
  const message = isDevelopment ? error.message : 'Internal server error';

  res.status(statusCode).json(createErrorResponse(message, isDevelopment ? [error.stack] : undefined));
};

// Authentication middleware for patient service
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // TODO: Implement JWT verification
  // For now, just pass through - will be implemented when integrating with auth service
  next();
};

// Authorization middleware 
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement role-based authorization
    // For now, just pass through
    next();
  };
};
