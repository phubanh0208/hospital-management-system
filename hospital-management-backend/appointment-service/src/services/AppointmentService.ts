import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';
import { EventService } from './EventService';

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
      
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      let whereConditions: string[] = [];
      let searchParams: any[] = [];

      if (search) {
        whereConditions.push(`(
          patient_name ILIKE $${searchParams.length + 1} OR 
          appointment_number ILIKE $${searchParams.length + 1} OR 
          patient_phone ILIKE $${searchParams.length + 1} OR
          doctor_name ILIKE $${searchParams.length + 1} OR
          reason ILIKE $${searchParams.length + 1}
        )`);
        searchParams.push(`%${search}%`);
      }

      if (doctorId) {
        whereConditions.push(`doctor_id = $${searchParams.length + 1}`);
        searchParams.push(doctorId);
      }

      if (patientId) {
        whereConditions.push(`patient_id = $${searchParams.length + 1}`);
        searchParams.push(patientId);
      }

      if (status) {
        whereConditions.push(`status = $${searchParams.length + 1}`);
        searchParams.push(status);
      }

      if (appointmentType) {
        whereConditions.push(`appointment_type = $${searchParams.length + 1}`);
        searchParams.push(appointmentType);
      }

      if (dateFrom) {
        whereConditions.push(`scheduled_date >= $${searchParams.length + 1}`);
        searchParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push(`scheduled_date <= $${searchParams.length + 1}`);
        searchParams.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments
        ${whereClause}
      `;
      const countResult = await executeQuery(this.pool, countQuery, searchParams);
      const totalCount = parseInt(countResult[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      // Get appointments
      const appointmentsQuery = `
        SELECT 
          id, appointment_number, patient_id, patient_name, patient_phone,
          doctor_id, doctor_name, appointment_type, scheduled_date, 
          duration_minutes, status, priority, reason, symptoms, notes,
          doctor_notes, room_number, fee, is_paid, created_by_user_id,
          created_at, updated_at, confirmed_at, completed_at
        FROM appointments
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
      `;

      const appointmentsResult = await executeQuery(
        this.pool, 
        appointmentsQuery, 
        [...searchParams, limit, offset]
      );

      const pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      return {
        success: true,
        data: {
          appointments: appointmentsResult,
          pagination
        }
      };
    } catch (error) {
      logger.error('Get all appointments error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointments'
      };
    }
  }

  async getAppointmentById(id: string): Promise<AppointmentResult> {
    try {
      const query = `
        SELECT 
          id, appointment_number, patient_id, patient_name, patient_phone,
          doctor_id, doctor_name, appointment_type, scheduled_date, 
          duration_minutes, status, priority, reason, symptoms, notes,
          doctor_notes, room_number, fee, is_paid, created_by_user_id,
          created_at, updated_at, confirmed_at, completed_at
        FROM appointments 
        WHERE id = $1
      `;
      
      const result = await executeQuery(this.pool, query, [id]);
      
      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Get appointment by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointment'
      };
    }
  }

  async getAppointmentByNumber(appointmentNumber: string): Promise<AppointmentResult> {
    try {
      const query = `
        SELECT 
          id, appointment_number, patient_id, patient_name, patient_phone,
          doctor_id, doctor_name, appointment_type, scheduled_date, 
          duration_minutes, status, priority, reason, symptoms, notes,
          doctor_notes, room_number, fee, is_paid, created_by_user_id,
          created_at, updated_at, confirmed_at, completed_at
        FROM appointments 
        WHERE appointment_number = $1
      `;
      
      const result = await executeQuery(this.pool, query, [appointmentNumber]);
      
      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Get appointment by number error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointment'
      };
    }
  }

  async createAppointment(appointmentData: CreateAppointmentData): Promise<AppointmentResult> {
    try {
      const id = uuidv4();
      const {
        patientId,
        patientName,
        patientPhone,
        doctorId,
        doctorName,
        appointmentType,
        scheduledDate,
        durationMinutes = 30,
        priority = 'normal',
        reason,
        symptoms,
        notes,
        roomNumber,
        fee = 0,
        createdByUserId
      } = appointmentData;

      const query = `
        INSERT INTO appointments (
          id, patient_id, patient_name, patient_phone, doctor_id, doctor_name,
          appointment_type, scheduled_date, duration_minutes, priority, reason,
          symptoms, notes, room_number, fee, created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING 
          id, appointment_number, patient_id, patient_name, patient_phone,
          doctor_id, doctor_name, appointment_type, scheduled_date, 
          duration_minutes, status, priority, reason, symptoms, notes,
          room_number, fee, is_paid, created_by_user_id, created_at, updated_at
      `;

      const values = [
        id, patientId, patientName, patientPhone, doctorId, doctorName,
        appointmentType, scheduledDate, durationMinutes, priority, reason,
        symptoms, notes, roomNumber, fee, createdByUserId
      ];

      const result = await executeQuery(this.pool, query, values);

      if (result.length > 0) {
        EventService.sendEvent('appointment.created', result[0]);
      }

      return {
        success: true,
        data: result[0],
        message: 'Appointment created successfully'
      };
    } catch (error) {
      logger.error('Create appointment error:', error);
      return {
        success: false,
        message: 'Failed to create appointment'
      };
    }
  }

  async updateAppointment(id: string, updateData: UpdateAppointmentData): Promise<AppointmentResult> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbField} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);
      
      // Add id for WHERE clause
      values.push(id);

      const query = `
        UPDATE appointments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, appointment_number, patient_id, patient_name, patient_phone,
          doctor_id, doctor_name, appointment_type, scheduled_date, 
          duration_minutes, status, priority, reason, symptoms, notes,
          doctor_notes, room_number, fee, is_paid, created_by_user_id,
          created_at, updated_at, confirmed_at, completed_at
      `;

      const result = await executeQuery(this.pool, query, values);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found'
        };
      }

      EventService.sendEvent('appointment.updated', result[0]);

      return {
        success: true,
        data: result[0],
        message: 'Appointment updated successfully'
      };
    } catch (error) {
      logger.error('Update appointment error:', error);
      return {
        success: false,
        message: 'Failed to update appointment'
      };
    }
  }

  async cancelAppointment(id: string): Promise<AppointmentResult> {
    try {
      const query = `
        UPDATE appointments 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND status NOT IN ('completed', 'cancelled')
        RETURNING 
          id, appointment_number, patient_name, doctor_name, 
          scheduled_date, status
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found or cannot be cancelled'
        };
      }

      EventService.sendEvent('appointment.cancelled', result[0]);

      return {
        success: true,
        data: result[0],
        message: 'Appointment cancelled successfully'
      };
    } catch (error) {
      logger.error('Cancel appointment error:', error);
      return {
        success: false,
        message: 'Failed to cancel appointment'
      };
    }
  }

  async confirmAppointment(id: string): Promise<AppointmentResult> {
    try {
      const query = `
        UPDATE appointments 
        SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'scheduled'
        RETURNING 
          id, appointment_number, patient_name, doctor_name, 
          scheduled_date, status, confirmed_at
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found or cannot be confirmed'
        };
      }

      EventService.sendEvent('appointment.updated', result[0]); // Confirmed is a status update

      return {
        success: true,
        data: result[0],
        message: 'Appointment confirmed successfully'
      };
    } catch (error) {
      logger.error('Confirm appointment error:', error);
      return {
        success: false,
        message: 'Failed to confirm appointment'
      };
    }
  }

  async completeAppointment(id: string, doctorNotes?: string): Promise<AppointmentResult> {
    try {
      const query = `
        UPDATE appointments 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
            doctor_notes = COALESCE($2, doctor_notes)
        WHERE id = $1 AND status IN ('confirmed', 'in_progress')
        RETURNING 
          id, appointment_number, patient_name, doctor_name, 
          scheduled_date, status, completed_at, doctor_notes
      `;

      const result = await executeQuery(this.pool, query, [id, doctorNotes]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment not found or cannot be completed'
        };
      }

      EventService.sendEvent('appointment.completed', result[0]);

      return {
        success: true,
        data: result[0],
        message: 'Appointment completed successfully'
      };
    } catch (error) {
      logger.error('Complete appointment error:', error);
      return {
        success: false,
        message: 'Failed to complete appointment'
      };
    }
  }

  async getAppointmentConflicts(doctorId?: string): Promise<AppointmentResult> {
    try {
      let query = `
        SELECT 
          id, doctor_id, conflict_date, conflict_type, description, resolved, created_at
        FROM appointment_conflicts
      `;
      
      const params: any[] = [];
      
      if (doctorId) {
        query += ` WHERE doctor_id = $1`;
        params.push(doctorId);
      }
      
      query += ` ORDER BY conflict_date DESC, created_at DESC`;

      const result = await executeQuery(this.pool, query, params);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get appointment conflicts error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointment conflicts'
      };
    }
  }

  async getDoctorSchedule(doctorId: string, dateFrom: string, dateTo: string): Promise<AppointmentResult> {
    try {
      const query = `
        SELECT 
          id, appointment_number, patient_name, patient_phone,
          appointment_type, scheduled_date, duration_minutes, status,
          priority, reason, room_number
        FROM appointments
        WHERE doctor_id = $1 
        AND scheduled_date >= $2 
        AND scheduled_date <= $3
        AND status NOT IN ('cancelled')
        ORDER BY scheduled_date ASC
      `;

      const result = await executeQuery(this.pool, query, [doctorId, dateFrom, dateTo]);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get doctor schedule error:', error);
      return {
        success: false,
        message: 'Failed to retrieve doctor schedule'
      };
    }
  }

  async getPatientAppointments(patientId: string): Promise<AppointmentResult> {
    try {
      const query = `
        SELECT 
          id, appointment_number, doctor_name, appointment_type, 
          scheduled_date, duration_minutes, status, priority, reason,
          symptoms, notes, doctor_notes, room_number, fee, is_paid,
          created_at, updated_at, confirmed_at, completed_at
        FROM appointments
        WHERE patient_id = $1
        ORDER BY scheduled_date DESC
      `;

      const result = await executeQuery(this.pool, query, [patientId]);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get patient appointments error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patient appointments'
      };
    }
  }
}
