import { 
  getPool, 
  executeQuery, 
  logger 
} from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';

export interface AppointmentSlotsResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface CreateAppointmentSlotsData {
  doctorId: string;
  slotDate: string;
  slotTime: string;
  durationMinutes?: number;
  maxBookings?: number;
}

export interface UpdateAppointmentSlotsData {
  slotDate?: string;
  slotTime?: string;
  durationMinutes?: number;
  isAvailable?: boolean;
  maxBookings?: number;
  currentBookings?: number;
}

export class AppointmentSlotsService {
  private pool = getPool('appointment');

  async getAvailableSlots(doctorId: string, date: string): Promise<AppointmentSlotsResult> {
    try {
      const query = `
        SELECT 
          id, doctor_id, slot_date, slot_time, duration_minutes, 
          is_available, max_bookings, current_bookings, created_at
        FROM appointment_slots
        WHERE doctor_id = $1 AND slot_date = $2 AND is_available = true
        ORDER BY slot_time
      `;

      const result = await executeQuery(this.pool, query, [doctorId, date]);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get available slots error:', error);
      return {
        success: false,
        message: 'Failed to retrieve available slots'
      };
    }
  }

  async getAllSlots(doctorId?: string, dateFrom?: string, dateTo?: string): Promise<AppointmentSlotsResult> {
    try {
      let query = `
        SELECT 
          id, doctor_id, slot_date, slot_time, duration_minutes, 
          is_available, max_bookings, current_bookings, created_at
        FROM appointment_slots
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      
      if (doctorId) {
        conditions.push(`doctor_id = $${params.length + 1}`);
        params.push(doctorId);
      }
      
      if (dateFrom) {
        conditions.push(`slot_date >= $${params.length + 1}`);
        params.push(dateFrom);
      }
      
      if (dateTo) {
        conditions.push(`slot_date <= $${params.length + 1}`);
        params.push(dateTo);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY slot_date, slot_time`;

      const result = await executeQuery(this.pool, query, params);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Get all slots error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointment slots'
      };
    }
  }

  async createAppointmentSlot(slotData: CreateAppointmentSlotsData): Promise<AppointmentSlotsResult> {
    try {
      const id = uuidv4();
      const {
        doctorId,
        slotDate,
        slotTime,
        durationMinutes = 30,
        maxBookings = 1
      } = slotData;

      const query = `
        INSERT INTO appointment_slots (
          id, doctor_id, slot_date, slot_time, duration_minutes, max_bookings
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING 
          id, doctor_id, slot_date, slot_time, duration_minutes, 
          is_available, max_bookings, current_bookings, created_at
      `;

      const values = [id, doctorId, slotDate, slotTime, durationMinutes, maxBookings];
      const result = await executeQuery(this.pool, query, values);

      return {
        success: true,
        data: result[0],
        message: 'Appointment slot created successfully'
      };
    } catch (error) {
      logger.error('Create appointment slot error:', error);
      return {
        success: false,
        message: 'Failed to create appointment slot'
      };
    }
  }

  async updateAppointmentSlot(id: string, updateData: UpdateAppointmentSlotsData): Promise<AppointmentSlotsResult> {
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
        UPDATE appointment_slots 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, doctor_id, slot_date, slot_time, duration_minutes, 
          is_available, max_bookings, current_bookings, created_at
      `;

      const result = await executeQuery(this.pool, query, values);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment slot not found'
        };
      }

      return {
        success: true,
        data: result[0],
        message: 'Appointment slot updated successfully'
      };
    } catch (error) {
      logger.error('Update appointment slot error:', error);
      return {
        success: false,
        message: 'Failed to update appointment slot'
      };
    }
  }

  async deleteAppointmentSlot(id: string): Promise<AppointmentSlotsResult> {
    try {
      const query = `
        DELETE FROM appointment_slots 
        WHERE id = $1
        RETURNING id, doctor_id, slot_date, slot_time
      `;

      const result = await executeQuery(this.pool, query, [id]);

      if (result.length === 0) {
        return {
          success: false,
          message: 'Appointment slot not found'
        };
      }

      return {
        success: true,
        data: result[0],
        message: 'Appointment slot deleted successfully'
      };
    } catch (error) {
      logger.error('Delete appointment slot error:', error);
      return {
        success: false,
        message: 'Failed to delete appointment slot'
      };
    }
  }

  async generateSlotsForDoctor(doctorId: string, dateFrom: string, dateTo: string): Promise<AppointmentSlotsResult> {
    try {
      // First get doctor availability
      const availabilityQuery = `
        SELECT day_of_week, start_time, end_time
        FROM doctor_availability
        WHERE doctor_id = $1 AND is_available = true
        ORDER BY day_of_week, start_time
      `;

      const availability = await executeQuery(this.pool, availabilityQuery, [doctorId]);

      if (availability.length === 0) {
        return {
          success: false,
          message: 'No availability found for this doctor'
        };
      }

      const slotsToInsert: any[] = [];
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      // Generate slots for each date in range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
        
        // Find availability for this day
        const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
        
        for (const avail of dayAvailability) {
          // Generate 30-minute slots between start and end time
          const startTime = new Date(`2000-01-01T${avail.start_time}`);
          const endTime = new Date(`2000-01-01T${avail.end_time}`);
          
          for (let slotTime = new Date(startTime); slotTime < endTime; slotTime.setMinutes(slotTime.getMinutes() + 30)) {
            const slotTimeStr = slotTime.toTimeString().substring(0, 5);
            const slotDateStr = date.toISOString().substring(0, 10);
            
            slotsToInsert.push({
              id: uuidv4(),
              doctorId,
              slotDate: slotDateStr,
              slotTime: slotTimeStr,
              durationMinutes: 30,
              isAvailable: true,
              maxBookings: 1,
              currentBookings: 0
            });
          }
        }
      }

      // Insert all slots
      if (slotsToInsert.length > 0) {
        const insertQuery = `
          INSERT INTO appointment_slots (
            id, doctor_id, slot_date, slot_time, duration_minutes, is_available, max_bookings, current_bookings
          ) VALUES ${slotsToInsert.map((_, index) => 
            `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8})`
          ).join(', ')}
          ON CONFLICT (doctor_id, slot_date, slot_time) DO NOTHING
          RETURNING id
        `;

        const insertValues = slotsToInsert.flatMap(slot => [
          slot.id, slot.doctorId, slot.slotDate, slot.slotTime, 
          slot.durationMinutes, slot.isAvailable, slot.maxBookings, slot.currentBookings
        ]);

        const result = await executeQuery(this.pool, insertQuery, insertValues);

        return {
          success: true,
          data: {
            slotsGenerated: result.length,
            totalSlots: slotsToInsert.length
          },
          message: `Generated ${result.length} appointment slots successfully`
        };
      }

      return {
        success: true,
        data: { slotsGenerated: 0, totalSlots: 0 },
        message: 'No slots generated'
      };
    } catch (error) {
      logger.error('Generate slots for doctor error:', error);
      return {
        success: false,
        message: 'Failed to generate appointment slots'
      };
    }
  }
}
