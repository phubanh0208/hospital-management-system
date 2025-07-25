import { Request, Response, NextFunction } from 'express';
import { logger } from '@hospital/shared';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: error.errors || [error.message]
    });
  }

  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  if (error.name === 'ForbiddenError' || error.statusCode === 403) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden'
    });
  }

  if (error.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  // Database errors
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Invalid reference to related resource'
    });
  }

  // Default server error
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};
