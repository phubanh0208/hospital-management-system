import { logger, executeQuery, getPool } from '@hospital/shared';
import { EventService } from './EventService';

export class AppointmentScheduler {
  private static instance: AppointmentScheduler;

  private constructor() {}

  public static getInstance(): AppointmentScheduler {
    if (!AppointmentScheduler.instance) {
      AppointmentScheduler.instance = new AppointmentScheduler();
    }
    return AppointmentScheduler.instance;
  }

  public async scheduleAppointmentNotifications(appointmentData: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
    appointment_time: string;
    appointment_number: string;
    room_number?: string;
    reason: string;
  }): Promise<void> {
    try {
      const notificationPayload = {
        recipient_user_id: appointmentData.patient_id,
        patient_name: appointmentData.patient_name,
        doctor_name: appointmentData.doctor_name,
        appointment_date: this.formatDate(appointmentData.appointment_date),
        appointment_time: appointmentData.appointment_time,
        appointment_number: appointmentData.appointment_number,
        room_number: appointmentData.room_number || 'TBD',
        reason: appointmentData.reason || 'General consultation',
      };

      // Send immediate confirmation notification
      await EventService.sendEvent('appointment.confirmed', { data: notificationPayload });
      logger.info('Appointment confirmation event sent', { appointmentId: appointmentData.appointment_id });

      // Schedule 24-hour reminder via delayed message
      const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
      const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
      const delay = reminderTime.getTime() - Date.now();

      if (delay > 0) {
        await EventService.sendDelayedEvent('appointment.reminder', { data: notificationPayload }, delay);
        logger.info('24-hour appointment reminder scheduled via delayed message', {
          appointmentId: appointmentData.appointment_id,
          reminderTime: reminderTime.toISOString(),
          delay: `${delay}ms`,
        });

        // Mark reminder as scheduled in the database
        await this.markReminderScheduled(appointmentData.appointment_id, reminderTime);
      } else {
        logger.warn('Appointment reminder time is in the past, not scheduling.', {
          appointmentId: appointmentData.appointment_id,
          reminderTime: reminderTime.toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error scheduling appointment notifications:', {
        error: error instanceof Error ? error.message : String(error),
        appointmentId: appointmentData.appointment_id
      });
      throw error;
    }
  }

  private async markReminderScheduled(appointmentId: string, reminderTime: Date): Promise<void> {
    try {
      const pool = getPool('appointment');
      const query = `
        UPDATE appointments
        SET
          reminder_sent_at = $2,
          updated_at = NOW()
        WHERE id = $1
      `;
      await executeQuery(pool, query, [appointmentId, reminderTime]);
      logger.debug('Marked reminder as scheduled in DB', { appointmentId, reminderTime });
    } catch (error) {
      logger.error('Error marking reminder as scheduled:', error);
      // Do not re-throw, as the main logic has already succeeded
    }
  }

  private formatDate(date: string | Date): string {
    // If date is a string in YYYY-MM-DD format, parse it as local date to avoid timezone issues
    let d: Date;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse YYYY-MM-DD as local date (not UTC)
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day); // month is 0-based
    } else {
      d = new Date(date);
    }

    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export const appointmentScheduler = AppointmentScheduler.getInstance();
