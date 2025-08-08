import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface DoctorAvailabilityResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface CreateDoctorAvailabilityData {
  doctorId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export interface UpdateDoctorAvailabilityData {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}

export class DoctorAvailabilityService {
  private pool = getPool('appointment');

  async getDoctorAvailability(doctorId?: string): Promise<DoctorAvailabilityResult> {
    try {
      let query = `
        SELECT 
          id, doctor_id, day_of_week, start_time, end_time, is_available, created_at
        FROM doctor_availability
      `;
      
      const params: any[] = [];
      
      if (doctorId) {
        query += ` WHERE doctor_id = $1`;
        params.push(doctorId);
      }
      
      query += ` ORDER BY doctor_id, day_of_week, start_time`;

      const result = await executeQuery(this.pool, query, params);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get doctor availability error:', error);
      return {
        success: false,
        message: 'Failed to retrieve doctor availability'
      };
    }
  }

  async createDoctorAvailability(availabilityData: CreateDoctorAvailabilityData): Promise<DoctorAvailabilityResult> {
    try {
      const id = uuidv4();
      const {
        doctorId,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable = true
      } = availabilityData;

      const query = `
        INSERT INTO doctor_availability (
          id, doctor_id, day_of_week, start_time, end_time, is_available
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING 
          id, doctor_id, day_of_week, start_time, end_time, is_available, created_at
      `;

      const values = [id, doctorId, dayOfWeek, startTime, endTime, isAvailable];
      const result = await executeQuery(this.pool, query, values);

      return {
        success: true,
        data: result[0],
        message: 'Doctor availability created successfully'
      };
    } catch (error) {
      logger.error('Create doctor availability error:', error);
      return {
        success: false,
        message: 'Failed to create doctor availability'
      };
    }
  }

  async updateDoctorAvailability(id: string, updateData: UpdateDoctorAvailabilityData): Promise<DoctorAvailabilityResult> {
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

      // Add id for WHERE clause
      values.push(id);

      const query = `
        UPDATE doctor_availability 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, doctor_id, day_of_week, start_time, end_time, is_available, created_at
      `;

      const result = await executeQuery(this.pool, query, values);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Doctor availability not found'
        };
      }

      return {
        success: true,
        data: result[0],
        message: 'Doctor availability updated successfully'
      };
    } catch (error) {
      logger.error('Update doctor availability error:', error);
      return {
        success: false,
        message: 'Failed to update doctor availability'
      };
    }
  }

  async deleteDoctorAvailability(id: string): Promise<DoctorAvailabilityResult> {
    try {
      const query = `
        DELETE FROM doctor_availability 
        WHERE id = $1
        RETURNING id, doctor_id, day_of_week, start_time, end_time
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Doctor availability not found'
        };
      }

      return {
        success: true,
        data: result[0],
        message: 'Doctor availability deleted successfully'
      };
    } catch (error) {
      logger.error('Delete doctor availability error:', error);
      return {
        success: false,
        message: 'Failed to delete doctor availability'
      };
    }
  }

  async getDoctorAvailabilityByDay(doctorId: string, dayOfWeek: number): Promise<DoctorAvailabilityResult> {
    try {
      const query = `
        SELECT 
          id, doctor_id, day_of_week, start_time, end_time, is_available, created_at
        FROM doctor_availability
        WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = true
        ORDER BY start_time
      `;

      const result = await executeQuery(this.pool, query, [doctorId, dayOfWeek]);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get doctor availability by day error:', error);
      return {
        success: false,
        message: 'Failed to retrieve doctor availability'
      };
    }
  }
}
