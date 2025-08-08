import pool from '../config/database';
import { QueryResult } from 'pg';

export interface PatientStatsByMonth {
  month: string;
  year: number;
  new_registrations: number;
  total_visits: number;
  unique_patients: number;
}

export interface PrescriptionReport {
  month: string;
  year: number;
  total_prescriptions: number;
  total_medications: number;
  total_cost: number;
  completed_prescriptions: number;
}

export interface DoctorPerformance {
  doctor_id: string;
  total_appointments: number;
  total_prescriptions: number;
  avg_duration: number;
  avg_satisfaction: number;
  total_revenue: number;
}

export interface SystemMetrics {
  metric_name: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
}

export class AnalyticsService {
  
  /**
   * Get patient statistics by month
   */
  async getPatientStatsByMonth(year?: number, limit: number = 12): Promise<PatientStatsByMonth[]> {
    try {
      const yearFilter = year ? 'AND EXTRACT(YEAR FROM day) = $2' : '';
      const params = year ? [limit, year] : [limit];
      
      const query = `
        SELECT 
          TO_CHAR(day, 'YYYY-MM') as month,
          EXTRACT(YEAR FROM day)::integer as year,
          COALESCE(new_registrations, 0) as new_registrations,
          COALESCE(visits, 0) as total_visits,
          COALESCE(unique_patients, 0) as unique_patients
        FROM daily_patient_summary
        WHERE day >= CURRENT_DATE - INTERVAL '${limit} months'
        ${yearFilter}
        ORDER BY day DESC
        LIMIT $1
      `;
      
      const result: QueryResult<PatientStatsByMonth> = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting patient stats by month:', error);
      throw new Error('Failed to retrieve patient statistics');
    }
  }

  /**
   * Get prescription reports by month
   */
  async getPrescriptionReports(year?: number, limit: number = 12): Promise<PrescriptionReport[]> {
    try {
      const yearFilter = year ? 'AND EXTRACT(YEAR FROM time) = $2' : '';
      const params = year ? [limit, year] : [limit];
      
      const query = `
        SELECT 
          TO_CHAR(DATE_TRUNC('month', time), 'YYYY-MM') as month,
          EXTRACT(YEAR FROM time)::integer as year,
          COUNT(*) as total_prescriptions,
          SUM(medication_count) as total_medications,
          SUM(total_cost) as total_cost,
          COUNT(*) FILTER (WHERE event_type = 'completed') as completed_prescriptions
        FROM prescription_metrics
        WHERE time >= CURRENT_DATE - INTERVAL '${limit} months'
        ${yearFilter}
        GROUP BY DATE_TRUNC('month', time)
        ORDER BY DATE_TRUNC('month', time) DESC
        LIMIT $1
      `;
      
      const result: QueryResult<PrescriptionReport> = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting prescription reports:', error);
      throw new Error('Failed to retrieve prescription reports');
    }
  }

  /**
   * Get doctor performance metrics
   */
  async getDoctorPerformance(doctorId?: string, days: number = 30): Promise<DoctorPerformance[]> {
    try {
      const doctorFilter = doctorId ? 'AND doctor_id = $2' : '';
      const params = doctorId ? [days, doctorId] : [days];
      
      const query = `
        SELECT 
          doctor_id,
          SUM(total_appointments) as total_appointments,
          SUM(total_prescriptions) as total_prescriptions,
          AVG(avg_duration) as avg_duration,
          AVG(avg_satisfaction) as avg_satisfaction,
          SUM(total_revenue) as total_revenue
        FROM doctor_daily_performance
        WHERE day >= CURRENT_DATE - INTERVAL '${days} days'
        ${doctorFilter}
        GROUP BY doctor_id
        ORDER BY total_revenue DESC
      `;
      
      const result: QueryResult<DoctorPerformance> = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting doctor performance:', error);
      throw new Error('Failed to retrieve doctor performance metrics');
    }
  }

  /**
   * Get system metrics summary
   */
  async getSystemMetrics(metricName?: string, hours: number = 24): Promise<SystemMetrics[]> {
    try {
      const metricFilter = metricName ? 'AND metric_name = $2' : '';
      const params = metricName ? [hours, metricName] : [hours];
      
      const query = `
        SELECT 
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as count
        FROM system_metrics
        WHERE time >= NOW() - INTERVAL '${hours} hours'
        ${metricFilter}
        GROUP BY metric_name
        ORDER BY metric_name
      `;
      
      const result: QueryResult<SystemMetrics> = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw new Error('Failed to retrieve system metrics');
    }
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(days: number = 30) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('day', time) as date,
          COUNT(*) as total_appointments,
          COUNT(*) FILTER (WHERE event_type = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE event_type = 'completed') as completed,
          COUNT(*) FILTER (WHERE event_type = 'cancelled') as cancelled,
          AVG(duration_minutes) as avg_duration,
          AVG(wait_time_minutes) as avg_wait_time,
          SUM(fee_amount) as total_revenue
        FROM appointment_metrics
        WHERE time >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', time)
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query, []);
      return result.rows;
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      throw new Error('Failed to retrieve appointment statistics');
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary() {
    try {
      const queries = await Promise.all([
        // Total patients this month
        pool.query(`
          SELECT COUNT(DISTINCT patient_id) as total_patients
          FROM patient_metrics 
          WHERE time >= DATE_TRUNC('month', CURRENT_DATE)
        `),
        
        // Total appointments this month
        pool.query(`
          SELECT COUNT(*) as total_appointments
          FROM appointment_metrics 
          WHERE time >= DATE_TRUNC('month', CURRENT_DATE)
        `),
        
        // Total prescriptions this month
        pool.query(`
          SELECT COUNT(*) as total_prescriptions
          FROM prescription_metrics 
          WHERE time >= DATE_TRUNC('month', CURRENT_DATE)
        `),
        
        // Revenue this month
        pool.query(`
          SELECT SUM(fee_amount) as total_revenue
          FROM appointment_metrics 
          WHERE time >= DATE_TRUNC('month', CURRENT_DATE)
          AND event_type = 'completed'
        `)
      ]);

      return {
        total_patients: queries[0].rows[0]?.total_patients || 0,
        total_appointments: queries[1].rows[0]?.total_appointments || 0,
        total_prescriptions: queries[2].rows[0]?.total_prescriptions || 0,
        total_revenue: queries[3].rows[0]?.total_revenue || 0
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw new Error('Failed to retrieve dashboard summary');
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshViews(): Promise<void> {
    try {
      await pool.query('SELECT refresh_analytics_views()');
      console.log('✅ Analytics views refreshed successfully');
    } catch (error) {
      console.error('Error refreshing views:', error);
      throw new Error('Failed to refresh analytics views');
    }
  }
}

