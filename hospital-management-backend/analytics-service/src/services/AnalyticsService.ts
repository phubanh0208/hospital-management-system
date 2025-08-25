import pool from '../config/database';
import { QueryResult } from 'pg';
import { executeQuery, getPool } from '@hospital/shared';

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
  private async fetchAllPages(baseUrl: string, dataKey: string) {
    const axios = require('axios');
    let page = 1;
    let allData: any[] = [];
    let totalPages = 1;

    while (page <= totalPages) {
      try {
        const response = await axios.get(`${baseUrl}?page=${page}&limit=100`, { timeout: 5000 });
        if (response.data?.success) {
          const data = response.data.data;
          allData = allData.concat(data[dataKey] || []);
          totalPages = data.pagination?.totalPages || 1;
          page++;
        } else {
          break;
        }
      } catch (error) {
        console.error(`Error fetching page ${page} from ${baseUrl}:`, error);
        break;
      }
    }
    return allData;
  }

  private prescriptionPool: any;

  constructor() {
    this.prescriptionPool = getPool('prescription');
  }

  /**
   * Process incoming events from other services
   */
  async processEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'appointment.created':
        case 'appointment.updated':
        case 'appointment.completed':
        case 'appointment.cancelled':
          await this.processAppointmentEvent(event);
          break;
        case 'patient.registered':
        case 'patient.updated':
          await this.processPatientEvent(event);
          break;
        case 'prescription.created':
        case 'prescription.dispensed':
        case 'prescription.completed':
          await this.processPrescriptionEvent(event);
          break;
        default:
          console.log(`Unknown event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  /**
   * Process appointment-related events
   */
  private async processAppointmentEvent(event: any): Promise<void> {
    const { payload } = event;
    const eventType = event.type.split('.')[1]; // 'created', 'updated', etc.

    const query = `
      INSERT INTO appointment_metrics (
        time, appointment_id, doctor_id, patient_id, event_type,
        duration_minutes, fee_amount, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      new Date(),
      payload.id,
      payload.doctorId || payload.doctor_id,
      payload.patientId || payload.patient_id,
      eventType,
      payload.durationMinutes || payload.duration_minutes,
      parseFloat(payload.fee) || 0,
      JSON.stringify(payload)
    ];

    await executeQuery(getPool('analytics'), query, values);
  }

  /**
   * Process patient-related events
   */
  private async processPatientEvent(event: any): Promise<void> {
    const { payload } = event;
    const metricType = event.type === 'patient.registered' ? 'registration' : 'update';

    const query = `
      INSERT INTO patient_metrics (
        time, patient_id, metric_type, metric_value, metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      new Date(),
      payload.id,
      metricType,
      1,
      JSON.stringify(payload)
    ];

    await executeQuery(getPool('analytics'), query, values);
  }

  /**
   * Process prescription-related events
   */
  private async processPrescriptionEvent(event: any): Promise<void> {
    const { payload } = event;
    const eventType = event.type.split('.')[1]; // 'created', 'dispensed', etc.

    const query = `
      INSERT INTO prescription_metrics (
        time, prescription_id, doctor_id, patient_id, event_type,
        medication_count, total_cost, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      new Date(),
      payload.id,
      payload.doctorId || payload.doctor_id,
      payload.patientId || payload.patient_id,
      eventType,
      payload.medications?.length || 1,
      parseFloat(payload.totalCost || payload.total_cost) || 0,
      JSON.stringify(payload)
    ];

    await executeQuery(getPool('analytics'), query, values);
  }


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
      const axios = require('axios');

      // Get prescriptions data from prescription service
            const prescriptionsResponse = await axios.get(`${process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004'}/api/prescriptions`, { timeout: 5000 });
      const prescriptionsData = prescriptionsResponse?.data?.data;

      const reports: PrescriptionReport[] = [];

      if (prescriptionsData?.prescriptions) {
        // Group prescriptions by month
        const monthlyData: { [key: string]: any } = {};

        prescriptionsData.prescriptions.forEach((prescription: any) => {
          const createdDate = new Date(prescription.created_at || prescription.createdAt);
          const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

          if (!year || createdDate.getFullYear() === year) {
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthKey,
                year: createdDate.getFullYear(),
                total_prescriptions: 0,
                total_medications: 0,
                total_cost: 0,
                completed_prescriptions: 0
              };
            }

            monthlyData[monthKey].total_prescriptions++;
            monthlyData[monthKey].total_medications += prescription.medications?.length || 1;
            monthlyData[monthKey].total_cost += parseFloat(prescription.total_cost || prescription.totalCost || 0);

            if (prescription.status === 'completed' || prescription.status === 'dispensed') {
              monthlyData[monthKey].completed_prescriptions++;
            }
          }
        });

        // Convert to array and sort by month (newest first)
        reports.push(...Object.values(monthlyData)
          .sort((a: any, b: any) => b.month.localeCompare(a.month))
          .slice(0, limit));
      }

      return reports;
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
      const [appointments, doctors, prescriptions] = await Promise.all([
        this.fetchAllPages(`${process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003'}/api/appointments`, 'appointments'),
        this.fetchAllPages(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/doctors`, 'doctors'),
        this.fetchAllPages(`${process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004'}/api/prescriptions`, 'prescriptions'),
      ]);

      const performance: DoctorPerformance[] = [];
      const doctorStats: { [key: string]: any } = {};

      // Initialize doctor stats from auth-service data
      doctors.forEach((doctor: any) => {
        if (!doctorId || doctor.userId === doctorId) {
          doctorStats[doctor.userId] = {
            doctor_id: doctor.userId,
            doctor_name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username || 'Unknown Doctor',
            specialization: doctor.specialization || 'General',
            total_appointments: 0,
            total_prescriptions: 0,
            avg_duration: 30, // Default duration
            avg_satisfaction: doctor.rating || 0,
            total_revenue: 0
          };
        }
      });

      // Count appointments per doctor
      appointments.forEach((appointment: any) => {
        const docId = appointment.doctorId || appointment.doctor_id;
        if (docId && doctorStats[docId]) {
          doctorStats[docId].total_appointments++;
          doctorStats[docId].total_revenue += parseFloat(appointment.fee) || 0;
        }
      });

      // Count prescriptions per doctor
      prescriptions.forEach((prescription: any) => {
        const docId = prescription.doctorId || prescription.doctor_id;
        if (docId && doctorStats[docId]) {
          doctorStats[docId].total_prescriptions++;
        }
      });

      // Convert to array and sort by total appointments
      performance.push(...Object.values(doctorStats)
        .sort((a: any, b: any) => b.total_appointments - a.total_appointments));

      return performance;
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

  /**
   * Get doctor-specific dashboard data
   */
  async getDoctorDashboard(doctorId: string, days: number = 30): Promise<any> {
    try {
      console.log(`Getting doctor dashboard for ${doctorId}, days: ${days}`);

      // Get appointments from appointment service
      const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003';
      const appointmentsResponse = await fetch(`${appointmentServiceUrl}/api/appointments?doctorId=${doctorId}&limit=1000`);

      if (!appointmentsResponse.ok) {
        console.warn(`Failed to get appointments for doctor ${doctorId}: ${appointmentsResponse.status}`);
        return this.getEmptyDashboard();
      }

      const appointmentsData = await appointmentsResponse.json() as any;
      const appointments = appointmentsData.data?.appointments || [];

      // Filter appointments by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledDate || apt.scheduled_date);
        return aptDate >= cutoffDate;
      });

      // Calculate stats
      const totalAppointments = recentAppointments.length;
      const uniquePatients = new Set(recentAppointments.map((apt: any) => apt.patientId || apt.patient_id)).size;
      const completedAppointments = recentAppointments.filter((apt: any) => apt.status === 'completed').length;
      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      const totalRevenue = recentAppointments.reduce((sum: number, apt: any) => sum + (apt.fee || 0), 0);

      // Get prescriptions count from prescription service
      let totalPrescriptions = 0;
      try {
        const prescriptionServiceUrl = process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004';
        const prescriptionsResponse = await fetch(`${prescriptionServiceUrl}/api/prescriptions?doctorId=${doctorId}&limit=1000`);
        if (prescriptionsResponse.ok) {
          const prescriptionsData = await prescriptionsResponse.json() as any;
          const prescriptions = prescriptionsData.data?.prescriptions || [];
          totalPrescriptions = prescriptions.filter((p: any) => {
            const pDate = new Date(p.createdAt || p.created_at);
            return pDate >= cutoffDate;
          }).length;
        }
      } catch (error) {
        console.warn('Failed to get prescriptions:', error);
      }

      // Calculate recent trends (last 7 days)
      const recentTrends = this.calculateDailyTrends(recentAppointments, 7);

      // Calculate top conditions
      const topConditions = this.calculateTopConditions(recentAppointments, 5);

      return {
        total_appointments: totalAppointments,
        unique_patients: uniquePatients,
        total_prescriptions: totalPrescriptions,
        completion_rate: Math.round(completionRate * 100) / 100,
        total_revenue: totalRevenue,

        recent_trends: recentTrends,
        top_conditions: topConditions
      };
    } catch (error) {
      console.error('Error getting doctor dashboard:', error);
      throw new Error('Failed to retrieve doctor dashboard');
    }
  }

  /**
   * Get admin-specific dashboard data
   */
  async getAdminDashboard(): Promise<any> {
    try {
      console.log('🚀 Starting getAdminDashboard...');
      // Use HTTP client to get data from other services
      const axios = require('axios');

      // Get data from other services via HTTP calls
                  // Helper to fetch all pages from a paginated endpoint
      const fetchAllPages = async (baseUrl: string, dataKey: string) => {
        let page = 1;
        let allData: any[] = [];
        let totalPages = 1;

        while (page <= totalPages) {
          try {
            const response = await axios.get(`${baseUrl}?page=${page}&limit=100`, { timeout: 5000 });
            if (response.data?.success) {
              const data = response.data.data;
              allData = allData.concat(data[dataKey] || []);
              totalPages = data.pagination?.totalPages || 1;
              page++;
            } else {
              break;
            }
          } catch (error) {
            console.error(`Error fetching page ${page} from ${baseUrl}:`, error);
            break;
          }
        }
        return allData;
      };

      const [appointments, patients, doctors, prescriptions] = await Promise.all([
        fetchAllPages(`${process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003'}/api/appointments`, 'appointments'),
        fetchAllPages(`${process.env.PATIENT_SERVICE_URL || 'http://localhost:3002'}/api/patients`, 'patients'),
        fetchAllPages(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/doctors`, 'doctors'),
        fetchAllPages(`${process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3004'}/api/prescriptions`, 'prescriptions')
      ]);

      const appointmentsData = { appointments };
      const patientsData = { patients };
      const doctorsData = { doctors };
      const prescriptionsData = { prescriptions };





      // Calculate totals
      const totalAppointments = appointmentsData?.appointments?.length || 0;
      const totalPatients = patientsData?.patients?.length || 0;
      const totalPrescriptions = prescriptionsData?.prescriptions?.length || 0;
      const totalDoctors = doctorsData?.doctors?.length || 0;

      // Calculate revenue from appointments
      let totalRevenue = 0;
      let completedAppointments = 0;

      if (appointmentsData?.appointments) {
        appointmentsData.appointments.forEach((appointment: any) => {
          if (appointment.fee) {
            totalRevenue += parseFloat(appointment.fee) || 0;
          }
          if (appointment.status === 'completed') {
            completedAppointments++;
          }
        });
      }

      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      // Calculate daily trends (simplified)
      const dailyTrends: any[] = [];
      const topDoctors: any[] = [];

      // Group appointments by date for trends
      if (appointmentsData?.appointments) {
        const appointmentsByDate: { [key: string]: any[] } = {};

        appointmentsData.appointments.forEach((appointment: any) => {
          const date = appointment.scheduledDate ? appointment.scheduledDate.split('T')[0] : new Date().toISOString().split('T')[0];
          if (!appointmentsByDate[date]) {
            appointmentsByDate[date] = [];
          }
          appointmentsByDate[date].push(appointment);
        });

        // Convert to trends array
        Object.keys(appointmentsByDate).slice(0, 30).forEach(date => {
          const dayAppointments = appointmentsByDate[date] || [];
          const dayRevenue = dayAppointments.reduce((sum, apt) => sum + (parseFloat(apt.fee) || 0), 0);

          dailyTrends.push({
            trend_date: date,
            appointments_count: dayAppointments.length,
            unique_patients_count: new Set(dayAppointments.map(apt => apt.patientId)).size,
            daily_revenue: dayRevenue
          });
        });
      }

      // Calculate top doctors using both doctors and appointments data
      if (appointmentsData?.appointments) {
        const doctorStats: { [key: string]: any } = {};

        // Initialize doctor stats from auth-service data if available
        if (doctorsData?.doctors) {
          doctorsData.doctors.forEach((doctor: any) => {
            doctorStats[doctor.userId] = {
              doctor_name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username || 'Unknown Doctor',
              specialization: doctor.specialization || 'General',
              appointment_count: 0,
              doctor_revenue: 0,
              rating: doctor.rating || 0
            };
          });
        }

        // Count appointments per doctor and create doctor entries from appointments if not exists
        appointmentsData.appointments.forEach((appointment: any) => {
          const doctorId = appointment.doctorId || appointment.doctor_id;
          if (doctorId) {
            // If doctor doesn't exist in stats, create from appointment data
            if (!doctorStats[doctorId]) {
              doctorStats[doctorId] = {
                doctor_name: appointment.doctor_name || `Doctor ${doctorId.substring(0, 8)}`,
                specialization: 'General',
                appointment_count: 0,
                doctor_revenue: 0,
                rating: 0
              };
            }

            doctorStats[doctorId].appointment_count++;
            doctorStats[doctorId].doctor_revenue += parseFloat(appointment.fee) || 0;

            // Track appointment status for completion rate
            if (!doctorStats[doctorId].completed_appointments) {
              doctorStats[doctorId].completed_appointments = 0;
            }
            if (appointment.status === 'completed') {
              doctorStats[doctorId].completed_appointments++;
            }

            // Track unique patients
            if (!doctorStats[doctorId].unique_patients) {
              doctorStats[doctorId].unique_patients = new Set();
            }
            if (appointment.patient_id || appointment.patientId) {
              doctorStats[doctorId].unique_patients.add(appointment.patient_id || appointment.patientId);
            }
          }
        });

        // Convert to array and sort by appointment count
        topDoctors.push(...Object.values(doctorStats)
          .filter((doctor: any) => doctor.appointment_count > 0) // Only include doctors with appointments
          .map((doctor: any) => ({
            ...doctor,
            completion_rate: doctor.appointment_count > 0 ?
              Math.round((doctor.completed_appointments || 0) / doctor.appointment_count * 100) : 0,
            unique_patients_count: doctor.unique_patients ? doctor.unique_patients.size : 0,
            avg_revenue_per_appointment: doctor.appointment_count > 0 ?
              Math.round(doctor.doctor_revenue / doctor.appointment_count * 100) / 100 : 0
          }))
          .sort((a: any, b: any) => b.appointment_count - a.appointment_count)
          .slice(0, 5));
      }

      // Calculate patient demographics
      const patientDemographics = {
        total_patients: totalPatients,
        age_groups: { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 },
        gender_distribution: { male: 0, female: 0, other: 0 },
        recent_registrations: 0
      };

      if (patientsData?.patients) {
        const currentDate = new Date();
        const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

        patientsData.patients.forEach((patient: any) => {
          // Age groups
          if (patient.dateOfBirth) {
            const birthDate = new Date(patient.dateOfBirth);
            const age = Math.floor((currentDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

            if (age <= 18) patientDemographics.age_groups['0-18']++;
            else if (age <= 35) patientDemographics.age_groups['19-35']++;
            else if (age <= 50) patientDemographics.age_groups['36-50']++;
            else if (age <= 65) patientDemographics.age_groups['51-65']++;
            else patientDemographics.age_groups['65+']++;
          }

          // Gender distribution
          const gender = patient.gender?.toLowerCase() || 'other';
          if (gender === 'male') {
            patientDemographics.gender_distribution.male++;
          } else if (gender === 'female') {
            patientDemographics.gender_distribution.female++;
          } else {
            patientDemographics.gender_distribution.other++;
          }

          // Recent registrations
          if (patient.createdAt || patient.created_at) {
            const createdDate = new Date(patient.createdAt || patient.created_at);
            if (createdDate >= thirtyDaysAgo) {
              patientDemographics.recent_registrations++;
            }
          }
        });
      }

      // Calculate monthly patient statistics
      const monthlyPatientStats: any[] = [];
      if (patientsData?.patients) {
        const monthlyData: { [key: string]: any } = {};

        patientsData.patients.forEach((patient: any) => {
          const createdDate = new Date(patient.createdAt || patient.created_at || patient.dateOfBirth);
          const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthKey,
              year: createdDate.getFullYear(),
              month_name: createdDate.toLocaleString('default', { month: 'long' }),
              new_patients: 0,
              total_appointments: 0,
              total_revenue: 0
            };
          }

          monthlyData[monthKey].new_patients++;
        });

        // Add appointment data to monthly stats
        if (appointmentsData?.appointments) {
          appointmentsData.appointments.forEach((appointment: any) => {
            const appointmentDate = new Date(appointment.scheduled_date || appointment.createdAt || appointment.created_at);
            const monthKey = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}`;

            if (monthlyData[monthKey]) {
              monthlyData[monthKey].total_appointments++;
              monthlyData[monthKey].total_revenue += parseFloat(appointment.fee) || 0;
            }
          });
        }

        // Convert to array and sort by month (newest first)
        monthlyPatientStats.push(...Object.values(monthlyData)
          .sort((a: any, b: any) => b.month.localeCompare(a.month))
          .slice(0, 12));
      }

      // Calculate prescription analytics
      console.log('🔍 Debug - Starting prescription analytics calculation...');
      const prescriptionAnalytics: any = {
        total_prescriptions: totalPrescriptions,
        recent_prescriptions: 0,
        top_medications: [],
        prescription_trends: [],
        total_cost: 0 // Initialize total_cost
      };
      console.log('🔍 Debug - Prescription analytics initialized:', prescriptionAnalytics);

      console.log('🔍 Debug - Prescriptions Data Available:', !!prescriptionsData?.prescriptions);
      console.log('🔍 Debug - Prescriptions Count:', prescriptionsData?.prescriptions?.length || 0);

      if (prescriptionsData?.prescriptions) {
        const currentDate = new Date();
        const sevenDaysAgo = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Count recent prescriptions (last 7 days)
        prescriptionsData.prescriptions.forEach((prescription: any) => {
          const prescriptionDate = new Date(prescription.createdAt || prescription.created_at);
          if (prescriptionDate >= sevenDaysAgo) {
            prescriptionAnalytics.recent_prescriptions++;
          }
        });

        // Calculate total cost and top medications from the initial prescription list
        try {
          const medicationCount: { [key: string]: number } = {};
          let totalCost = 0;

          prescriptionsData.prescriptions.forEach((prescription: any) => {
            // Sum up the total_amount from each prescription
            totalCost += parseFloat(prescription.total_amount || 0);

            // Aggregate medication counts from items if available from the initial fetch
            if (prescription.items && Array.isArray(prescription.items)) {
              prescription.items.forEach((item: any) => {
                const medName = item.medication_name || 'Unknown Medication';
                medicationCount[medName] = (medicationCount[medName] || 0) + 1;
              });
            }
          });

          prescriptionAnalytics.total_cost = totalCost;

          // Convert medication counts to array and sort
          prescriptionAnalytics.top_medications = Object.entries(medicationCount)
            .map(([name, count]) => ({ medication_name: name, prescription_count: count }))
            .sort((a: any, b: any) => b.prescription_count - a.prescription_count)
            .slice(0, 5);

        } catch (error) {
          console.error('Error processing prescription analytics:', error);
          prescriptionAnalytics.total_cost = 0; // Fallback
          prescriptionAnalytics.top_medications = []; // Fallback
        }
      }

      console.log('🔍 Debug - About to return dashboard data...');
      console.log('🔍 Debug - Prescription analytics final:', prescriptionAnalytics);

      const result = {
        total_patients: totalPatients,
        total_doctors: totalDoctors,
        total_appointments: totalAppointments,
        total_prescriptions: totalPrescriptions,
        total_revenue: totalRevenue,
        completion_rate: Math.round(completionRate * 100) / 100,
        daily_trends: dailyTrends,
        top_doctors: topDoctors,
        patient_demographics: patientDemographics,
        monthly_patient_stats: monthlyPatientStats,
        prescription_analytics: prescriptionAnalytics
      };

      console.log('🔍 Debug - Result keys:', Object.keys(result));
      return result;
    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      throw new Error('Failed to retrieve admin dashboard');
    }
  }

  /**
   * Get doctor's patients analytics
   */
  async getDoctorPatients(doctorId: string, days: number = 30): Promise<any[]> {
    try {
      console.log(`Getting doctor patients for ${doctorId}, days: ${days}`);

      // Get appointments from appointment service
      const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003';
      const appointmentsResponse = await fetch(`${appointmentServiceUrl}/api/appointments?doctorId=${doctorId}&limit=1000`);

      if (!appointmentsResponse.ok) {
        console.warn(`Failed to get appointments for doctor ${doctorId}: ${appointmentsResponse.status}`);
        return [];
      }

      const appointmentsData = await appointmentsResponse.json() as any;
      const appointments = appointmentsData.data?.appointments || [];

      // Filter appointments by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledDate || apt.scheduled_date);
        return aptDate >= cutoffDate;
      });

      // Group by patient and calculate stats
      const patientStats: { [key: string]: any } = {};

      recentAppointments.forEach((apt: any) => {
        const patientId = apt.patientId || apt.patient_id;
        if (!patientId) return;

        if (!patientStats[patientId]) {
          patientStats[patientId] = {
            patient_id: patientId,
            patient_name: apt.patientName || apt.patient_name || 'Unknown',
            appointment_count: 0,
            last_appointment: null,
            prescription_count: 0,
            common_conditions: new Set<string>()
          };
        }

        patientStats[patientId].appointment_count++;

        const aptDate = new Date(apt.scheduledDate || apt.scheduled_date);
        if (!patientStats[patientId].last_appointment || aptDate > new Date(patientStats[patientId].last_appointment)) {
          patientStats[patientId].last_appointment = aptDate.toISOString().split('T')[0];
        }

        if (apt.reason) {
          patientStats[patientId].common_conditions.add(apt.reason);
        }
      });

      // Convert to array and format
      return Object.values(patientStats)
        .map((stats: any) => ({
          ...stats,
          common_conditions: Array.from(stats.common_conditions).join(', ')
        }))
        .sort((a, b) => b.appointment_count - a.appointment_count);
    } catch (error) {
      console.error('Error getting doctor patients:', error);
      throw new Error('Failed to retrieve doctor patients');
    }
  }

  /**
   * Get doctor appointment trends
   */
  async getDoctorAppointmentTrends(doctorId: string, days: number = 30): Promise<any[]> {
    try {
      console.log(`Getting doctor appointment trends for ${doctorId}, days: ${days}`);

      // Get appointments from appointment service
      const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003';
      const appointmentsResponse = await fetch(`${appointmentServiceUrl}/api/appointments?doctorId=${doctorId}&limit=1000`);

      if (!appointmentsResponse.ok) {
        console.warn(`Failed to get appointments for doctor ${doctorId}: ${appointmentsResponse.status}`);
        return [];
      }

      const appointmentsData = await appointmentsResponse.json() as any;
      const appointments = appointmentsData.data?.appointments || [];

      // Filter appointments by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledDate || apt.scheduled_date);
        return aptDate >= cutoffDate;
      });

      // Group by date and calculate trends
      return this.calculateDetailedDailyTrends(recentAppointments, days);
    } catch (error) {
      console.error('Error getting doctor appointment trends:', error);
      throw new Error('Failed to retrieve doctor appointment trends');
    }
  }

  /**
   * Get empty dashboard data
   */
  private getEmptyDashboard(): any {
    return {
      total_appointments: 0,
      unique_patients: 0,
      total_prescriptions: 0,
      completion_rate: 0,
      total_revenue: 0,
      recent_trends: [],
      top_conditions: []
    };
  }

  /**
   * Calculate daily trends from appointments
   */
  private calculateDailyTrends(appointments: any[], maxDays: number): any[] {
    const dailyStats: { [key: string]: { appointment_date: string; daily_count: number } } = {};

    appointments.forEach((apt: any) => {
      const scheduledDate = apt.scheduledDate || apt.scheduled_date;
      if (!scheduledDate) return;

      const date = new Date(scheduledDate).toISOString().split('T')[0];
      if (!date) return;

      if (!dailyStats[date]) {
        dailyStats[date] = {
          appointment_date: date,
          daily_count: 0
        };
      }

      dailyStats[date].daily_count++;
    });

    // Convert to array and format
    return Object.values(dailyStats)
      .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
      .slice(0, maxDays);
  }

  /**
   * Calculate top conditions from appointments
   */
  private calculateTopConditions(appointments: any[], limit: number): any[] {
    const conditionCounts: { [key: string]: number } = {};

    appointments.forEach((apt: any) => {
      const reason = apt.reason;
      if (reason && typeof reason === 'string') {
        conditionCounts[reason] = (conditionCounts[reason] || 0) + 1;
      }
    });

    return Object.entries(conditionCounts)
      .map(([reason, frequency]) => ({ reason, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Calculate detailed daily trends from appointments
   */
  private calculateDetailedDailyTrends(appointments: any[], maxDays: number): any[] {
    const dailyStats: { [key: string]: {
      appointment_date: string;
      appointment_count: number;
      completed_count: number;
      cancelled_count: number;
      revenue: number;
    } } = {};

    appointments.forEach((apt: any) => {
      const scheduledDate = apt.scheduledDate || apt.scheduled_date;
      if (!scheduledDate) return;

      const date = new Date(scheduledDate).toISOString().split('T')[0];
      if (!date) return;

      if (!dailyStats[date]) {
        dailyStats[date] = {
          appointment_date: date,
          appointment_count: 0,
          completed_count: 0,
          cancelled_count: 0,
          revenue: 0
        };
      }

      dailyStats[date].appointment_count++;

      if (apt.status === 'completed') {
        dailyStats[date].completed_count++;
        dailyStats[date].revenue += apt.fee || 0;
      } else if (apt.status === 'cancelled') {
        dailyStats[date].cancelled_count++;
      }
    });

    // Convert to array and format
    return Object.values(dailyStats)
      .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
      .slice(0, maxDays);
  }
}

