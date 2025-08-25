import {
  User, UserProfile, Patient, Appointment, Prescription,
  UserRole, Gender, BloodType, AppointmentStatus,
  PrescriptionStatus, NotificationType
} from './types';
import { isValidEmail, isValidPhone, isValidUUID, isValidUrl } from './utils';

// User validation
export const validateUser = (data: Partial<User>): string[] => {
  const errors: string[] = [];
  
  if (!data.username) {
    errors.push('Username is required');
  } else if (data.username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.role) {
    errors.push('User role is required');
  } else if (!Object.values(UserRole).includes(data.role as UserRole)) {
    errors.push('Invalid user role');
  }
  
  return errors;
};

// User profile validation
export const validateUserProfile = (data: Partial<UserProfile>): string[] => {
  const errors: string[] = [];

  if (data.firstName && data.firstName.trim().length < 1) {
    errors.push('First name cannot be empty');
  }

  if (data.lastName && data.lastName.trim().length < 1) {
    errors.push('Last name cannot be empty');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const now = new Date();
    if (dob > now) {
      errors.push('Date of birth cannot be in the future');
    }
    const age = now.getFullYear() - dob.getFullYear();
    if (age > 150) {
      errors.push('Invalid date of birth');
    }
  }

  if (data.address && data.address.trim().length < 5) {
    errors.push('Address must be at least 5 characters long');
  }

  if (data.avatarUrl && !isValidUrl(data.avatarUrl)) {
    errors.push('Invalid avatar URL format');
  }

  return errors;
};

export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return errors;
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return errors;
};

// Patient validation
export const validatePatient = (data: Partial<Patient>, isPartial = false): string[] => {
  const errors: string[] = [];
  
  if (!isPartial && !data.fullName) {
    errors.push('Full name is required');
  } else if (data.fullName && data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }
  
  if (!isPartial && !data.dateOfBirth) {
    errors.push('Date of birth is required');
  } else if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const now = new Date();
    if (dob > now) {
      errors.push('Date of birth cannot be in the future');
    }
    const age = now.getFullYear() - dob.getFullYear();
    if (age > 150) {
      errors.push('Invalid date of birth');
    }
  }
  
  if (!isPartial && !data.gender) {
    errors.push('Gender is required');
  } else if (data.gender && !Object.values(Gender).includes(data.gender as Gender)) {
    errors.push('Invalid gender');
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!isPartial && !data.phone) {
    errors.push('Phone number is required');
  } else if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (!isPartial && !data.address) {
    errors.push('Address is required');
  } else if (data.address) {
    if (!data.address.street) {
      errors.push('Street address is required');
    }
    if (!data.address.city) {
      errors.push('City is required');
    }
    if (!data.address.district) {
      errors.push('District is required');
    }
    if (!data.address.ward) {
      errors.push('Ward is required');
    }
  }
  
  if (!isPartial && !data.emergencyContact) {
    errors.push('Emergency contact is required');
  } else if (data.emergencyContact) {
    if (!data.emergencyContact.name) {
      errors.push('Emergency contact name is required');
    }
    if (!data.emergencyContact.phone) {
      errors.push('Emergency contact phone is required');
    }
    if (!data.emergencyContact.relationship) {
      errors.push('Emergency contact relationship is required');
    }
  }
  
  if (data.bloodType && !Object.values(BloodType).includes(data.bloodType as BloodType)) {
    errors.push('Invalid blood type');
  }
  
  return errors;
};

// Appointment validation
export const validateAppointment = (data: Partial<Appointment>, isPartial = false): string[] => {
  const errors: string[] = [];
  
  if (!isPartial && !data.patientId) {
    errors.push('Patient ID is required');
  } else if (data.patientId && !isValidUUID(data.patientId)) {
    errors.push('Invalid patient ID format');
  }

  if (!isPartial && !data.doctorId) {
    errors.push('Doctor ID is required');
  } else if (data.doctorId && !isValidUUID(data.doctorId)) {
    errors.push('Invalid doctor ID format');
  }

  if (!isPartial && !data.appointmentDate) {
    errors.push('Appointment date is required');
  } else if (data.appointmentDate) {
    const apptDate = new Date(data.appointmentDate);
    const now = new Date();
    if (apptDate < now) {
      errors.push('Appointment date cannot be in the past');
    }
  }

  if (!isPartial && !data.appointmentTime) {
    errors.push('Appointment time is required');
  }

  if (data.status && !Object.values(AppointmentStatus).includes(data.status as AppointmentStatus)) {
    errors.push('Invalid appointment status');
  }

  if (!isPartial && !data.type) {
    errors.push('Appointment type is required');
  }
  
  return errors;
};



// Prescription validation - Note: Prescription items are separate entities
export const validatePrescription = (data: Partial<Prescription>): string[] => {
  const errors: string[] = [];
  
  if (!data.patientId) {
    errors.push('Patient ID is required');
  } else if (!isValidUUID(data.patientId)) {
    errors.push('Invalid patient ID format');
  }
  
  if (!data.doctorId) {
    errors.push('Doctor ID is required');
  } else if (!isValidUUID(data.doctorId)) {
    errors.push('Invalid doctor ID format');
  }
  
  if (data.status && !Object.values(PrescriptionStatus).includes(data.status as PrescriptionStatus)) {
    errors.push('Invalid prescription status');
  }
  
  return errors;
};

// Notification validation
export const validateNotification = (data: any): string[] => {
  const errors: string[] = [];
  
  if (!data.recipientId) {
    errors.push('Recipient ID is required');
  } else if (!isValidUUID(data.recipientId)) {
    errors.push('Invalid recipient ID format');
  }
  
  if (!data.type) {
    errors.push('Notification type is required');
  } else if (!Object.values(NotificationType).includes(data.type as NotificationType)) {
    errors.push('Invalid notification type');
  }
  
  if (!data.title) {
    errors.push('Notification title is required');
  }
  
  if (!data.message) {
    errors.push('Notification message is required');
  }
  
  return errors;
};

// Generic validation helper
export const validateRequired = (data: any, requiredFields: string[]): string[] => {
  const errors: string[] = [];
  
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });
  
  return errors;
};

export const validateFieldLengths = (data: any, fieldLengths: Record<string, number>): string[] => {
  const errors: string[] = [];
  
  Object.entries(fieldLengths).forEach(([field, maxLength]) => {
    if (data[field] && data[field].length > maxLength) {
      errors.push(`${field} must be no more than ${maxLength} characters`);
    }
  });
  
  return errors;
};

export const validateDateRange = (
  startDate: Date | string, 
  endDate: Date | string, 
  fieldName: string = 'Date'
): string[] => {
  const errors: string[] = [];
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  if (start > end) {
    errors.push(`${fieldName} range is invalid: start date must be before end date`);
  }
  
  return errors;
};

export const validateEnum = <T>(
  value: any, 
  enumObject: T, 
  fieldName: string
): string[] => {
  const errors: string[] = [];
  
  if (!Object.values(enumObject as any).includes(value)) {
    const validValues = Object.values(enumObject as any).join(', ');
    errors.push(`Invalid ${fieldName}. Valid values are: ${validValues}`);
  }
  
  return errors;
};

// Comprehensive validation
export const validateEntity = (
  entityType: string,
  data: any
): { isValid: boolean; errors: string[] } => {
  let errors: string[] = [];
  
  switch (entityType.toLowerCase()) {
    case 'user':
      errors = validateUser(data);
      break;
    case 'patient':
      errors = validatePatient(data);
      break;
    case 'appointment':
      errors = validateAppointment(data);
      break;
    case 'prescription':
      errors = validatePrescription(data);
      break;
    case 'notification':
      errors = validateNotification(data);
      break;
    default:
      errors.push(`Unknown entity type: ${entityType}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
