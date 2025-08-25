import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload } from './types';

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT utilities
export const generateToken = (payload: JWTPayload, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string, secret: string): JWTPayload | null => {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const generateRefreshToken = (userId: string, secret: string): string => {
  return jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn: '7d' });
};

// Token extraction from request
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Generate random codes
export const generateCode = (prefix: string, length: number = 8): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, length);
  return `${prefix}${timestamp.slice(-4)}${random}`.toUpperCase();
};

export const generatePatientCode = (): string => {
  return generateCode('BN', 6);
};

export const generateAppointmentNumber = (): string => {
  return generateCode('LH', 8);
};

export const generatePrescriptionNumber = (): string => {
  return generateCode('DT', 8);
};

// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export const isValidDate = (date: string): boolean => {
  return !isNaN(Date.parse(date));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters except + for international format
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

  // Vietnam phone number patterns
  const vietnamRegex = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/;

  // International phone number pattern (basic)
  const internationalRegex = /^\+[1-9]\d{1,14}$/;

  // US/Canada phone number pattern
  const usRegex = /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;

  // Basic phone number pattern (10-15 digits)
  const basicRegex = /^[0-9]{10,15}$/;

  return vietnamRegex.test(cleanPhone) ||
         internationalRegex.test(cleanPhone) ||
         usRegex.test(cleanPhone) ||
         basicRegex.test(cleanPhone);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitization utilities
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

// Response utilities
export const createResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  errors?: any[]
) => {
  return {
    success,
    data,
    message,
    errors,
    timestamp: new Date().toISOString()
  };
};

export const createSuccessResponse = <T>(data: T, message?: string) => {
  return createResponse(true, data, message);
};

export const createErrorResponse = (message: string, errors?: any[]) => {
  return createResponse(false, undefined, message, errors);
};

// Pagination utilities
export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev
  };
};

export const getPaginationOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

// Object utilities
export const removeUndefinedFields = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

export const pickFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> => {
  const result: Partial<T> = {};
  fields.forEach(field => {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  });
  return result;
};

// Error handling utilities
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createValidationError = (field: string, message: string) => {
  return {
    field,
    message,
    code: 'VALIDATION_ERROR'
  };
};

// Environment utilities
export const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};

export const getEnvNumber = (name: string, defaultValue?: number): number => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

export const getEnvBoolean = (name: string, defaultValue?: boolean): boolean => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? value === 'true' : defaultValue!;
};

// Encryption utilities for sensitive data
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export const getEncryptionKey = (): Buffer => {
  const key = getEnvVar('ENCRYPTION_KEY');
  if (key.length !== 64) { // 32 bytes = 64 hex chars
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(key, 'hex');
};

export const encryptSensitiveData = (text: string): string => {
  if (!text || text.trim() === '') {
    return text;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv + encrypted data
    return iv.toString('hex') + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
};

export const decryptSensitiveData = (encryptedText: string): string => {
  if (!encryptedText || encryptedText.trim() === '') {
    return encryptedText;
  }
  
  try {
    const key = getEncryptionKey();
    
    // Extract iv and encrypted data
    const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
    const encrypted = encryptedText.slice(IV_LENGTH * 2);
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
};

// Helper functions for specific data types
export const encryptEmail = (email: string): string => {
  return encryptSensitiveData(email);
};

export const decryptEmail = (encryptedEmail: string): string => {
  return decryptSensitiveData(encryptedEmail);
};

export const encryptPhone = (phone: string): string => {
  return encryptSensitiveData(phone);
};

export const decryptPhone = (encryptedPhone: string): string => {
  return decryptSensitiveData(encryptedPhone);
};
