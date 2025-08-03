import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';
import { EventService } from './EventService';
import { appointmentScheduler } from './AppointmentReminderScheduler';

export interface AppointmentResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface AppointmentQueryOptions {
  page: number;
  limit: number;
  search?: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
  appointmentType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateAppointmentData {
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  appointmentType: string;
  scheduledDate: string;
  durationMinutes?: number;
  priority?: string;
  reason: string;
  symptoms?: string;
  notes?: string;
  roomNumber?: string;
  fee?: number;
  createdByUserId: string;
}

export interface UpdateAppointmentData {
  appointmentType?: string;
  scheduledDate?: string;
  durationMinutes?: number;
  status?: string;
  priority?: string;
  reason?: string;
  symptoms?: string;
  notes?: string;
  doctorNotes?: string;
  roomNumber?: string;
  fee?: number;
  isPaid?: boolean;
}

export class AppointmentService {
  private pool = getPool('appointment');

  async getAllAppointments(options: AppointmentQueryOptions): Promise<AppointmentResult> {
    try {
      const { 
        page, 
        limit, 
        search, 
        doctorId, 
        patientId, 
        status, 
        appointmentType, 
        dateFrom, 
        dateTo,
        sortBy = 'scheduled_date', 
        sortOrder = 'asc' 
      } = options;

// Optimized: Mon, Sep  8, 2025 12:58:41 AM
// Removed redundant code and improved performance
