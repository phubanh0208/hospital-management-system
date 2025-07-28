import { getPool, executeQuery, logger } from '@hospital/shared';

export class VisitSummaryService {
  private pool = getPool('patient');

  /**
   * Update visit summary for a patient by calculating from actual data
   */
  async updateVisitSummary(patientId: string): Promise<{ success: boolean; message?: string }> {
    try {
      logger.info(`Updating visit summary for patient: ${patientId}`);

      // Get appointment statistics from appointment service
      const appointmentStats = await this.getAppointmentStats(patientId);
      
      // Get prescription statistics from prescription service  
      const prescriptionStats = await this.getPrescriptionStats(patientId);

      // Update or insert visit summary
      const query = `
        INSERT INTO patient_visit_summary (
          id, patient_id, last_appointment_date, total_appointments, 
          active_prescriptions, last_prescription_date, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
        )
        ON CONFLICT (patient_id) 
        DO UPDATE SET
          last_appointment_date = $2,
          total_appointments = $3,
          active_prescriptions = $4,
          last_prescription_date = $5,
          updated_at = NOW()
      `;

      await executeQuery(this.pool, query, [
        patientId,
        appointmentStats.lastAppointmentDate,
        appointmentStats.totalAppointments,
        prescriptionStats.activePrescriptions,
        prescriptionStats.lastPrescriptionDate
      ]);

      logger.info(`Visit summary updated for patient ${patientId}: ${appointmentStats.totalAppointments} appointments, ${prescriptionStats.activePrescriptions} active prescriptions`);

      return { success: true };
    } catch (error) {
      logger.error('Update visit summary error:', error);
      return { 
        success: false, 
        message: 'Failed to update visit summary' 
      };
    }
  }

  /**
   * Get appointment statistics by calling appointment service
   */
  private async getAppointmentStats(patientId: string): Promise<{
    totalAppointments: number;
    lastAppointmentDate: string | null;
  }> {
    try {
      // Call appointment service API
      const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003';
      
      const response = await fetch(`${appointmentServiceUrl}/api/appointments?patientId=${patientId}&limit=1000`);
      
      if (!response.ok) {
        logger.warn(`Failed to get appointments for patient ${patientId}: ${response.status}`);
        return { totalAppointments: 0, lastAppointmentDate: null };
      }

      const data = await response.json() as any;
      const appointments = data.data?.appointments || [];

      // Calculate stats
      const totalAppointments = appointments.length;
      const lastAppointmentDate = appointments.length > 0 
        ? appointments
            .map((apt: any) => new Date(apt.scheduledDate || apt.scheduled_date))
            .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
            .toISOString().split('T')[0]
        : null;

      return { totalAppointments, lastAppointmentDate };
    } catch (error) {
      logger.error('Get appointment stats error:', error);
      return { totalAppointments: 0, lastAppointmentDate: null };
    }
  }

  /**
   * Get prescription statistics by calling prescription service
   */
  private async getPrescriptionStats(patientId: string): Promise<{
    activePrescriptions: number;
    lastPrescriptionDate: string | null;
  }> {
    try {
      // Call prescription service API
      const prescriptionServiceUrl = process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004';
      
      const response = await fetch(`${prescriptionServiceUrl}/api/prescriptions?patientId=${patientId}&limit=1000`);
      
      if (!response.ok) {
        logger.warn(`Failed to get prescriptions for patient ${patientId}: ${response.status}`);
        return { activePrescriptions: 0, lastPrescriptionDate: null };
      }

      const data = await response.json() as any;
      const prescriptions = data.data?.prescriptions || [];

      // Calculate stats
      // Count prescriptions that are active (draft + active status)
      // - 'draft': Created prescriptions not yet finalized
      // - 'active': Active prescriptions ready for dispensing
      // Exclude: 'dispensed', 'completed', 'cancelled', 'expired'
      const activePrescriptions = prescriptions.filter((rx: any) => 
        rx.status === 'active' || rx.status === 'draft'
      ).length;

      const lastPrescriptionDate = prescriptions.length > 0
        ? prescriptions
            .map((rx: any) => new Date(rx.createdAt || rx.created_at))
            .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
            .toISOString().split('T')[0]
        : null;

      return { activePrescriptions, lastPrescriptionDate };
    } catch (error) {
      logger.error('Get prescription stats error:', error);
      return { activePrescriptions: 0, lastPrescriptionDate: null };
    }
  }

  /**
   * Update visit summaries for all patients
   */
  async updateAllVisitSummaries(): Promise<{ success: boolean; updated: number; message?: string }> {
    try {
      // Get all patient IDs
      const patients = await executeQuery(this.pool, 'SELECT id FROM patients WHERE is_active = true');
      
      let updated = 0;
      for (const patient of patients) {
        const result = await this.updateVisitSummary(patient.id);
        if (result.success) {
          updated++;
        }
      }

      logger.info(`Updated visit summaries for ${updated}/${patients.length} patients`);
      
      return { 
        success: true, 
        updated,
        message: `Updated ${updated} patient visit summaries`
      };
    } catch (error) {
      logger.error('Update all visit summaries error:', error);
      return { 
        success: false, 
        updated: 0,
        message: 'Failed to update visit summaries' 
      };
    }
  }
}
