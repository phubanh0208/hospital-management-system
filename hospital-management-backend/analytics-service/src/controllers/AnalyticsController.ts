import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get patient statistics by month
   * GET /api/analytics/patients/monthly
   */
  getPatientStatsByMonth = async (req: Request, res: Response): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const stats = await this.analyticsService.getPatientStatsByMonth(year, limit);

      res.status(200).json({
        success: true,
        data: {
          statistics: stats,
          summary: {
            total_months: stats.length,
            total_new_registrations: stats.reduce((sum, stat) => sum + stat.new_registrations, 0),
            total_visits: stats.reduce((sum, stat) => sum + stat.total_visits, 0),
            avg_patients_per_month: Math.round(stats.reduce((sum, stat) => sum + stat.unique_patients, 0) / stats.length)
          }
        },
        message: 'Patient statistics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPatientStatsByMonth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve patient statistics',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get prescription reports
   * GET /api/analytics/prescriptions/reports
   */
  getPrescriptionReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const reports = await this.analyticsService.getPrescriptionReports(year, limit);

      res.status(200).json({
        success: true,
        data: {
          reports: reports,
          summary: {
            total_months: reports.length,
            total_prescriptions: reports.reduce((sum, report) => sum + report.total_prescriptions, 0),
            total_medications: reports.reduce((sum, report) => sum + report.total_medications, 0),
            total_cost: reports.reduce((sum, report) => sum + report.total_cost, 0),
            completion_rate: reports.length > 0 ? 
              Math.round((reports.reduce((sum, report) => sum + report.completed_prescriptions, 0) / 
                         reports.reduce((sum, report) => sum + report.total_prescriptions, 0)) * 100) : 0
          }
        },
        message: 'Prescription reports retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPrescriptionReports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve prescription reports',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get doctor performance metrics
   * GET /api/analytics/doctors/performance
   */
  getDoctorPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = req.query.doctorId as string;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const performance = await this.analyticsService.getDoctorPerformance(doctorId, days);

      res.status(200).json({
        success: true,
        data: {
          performance: performance,
          period: `${days} days`,
          summary: {
            total_doctors: performance.length,
            total_appointments: performance.reduce((sum, perf) => sum + perf.total_appointments, 0),
            total_revenue: performance.reduce((sum, perf) => sum + perf.total_revenue, 0),
            avg_satisfaction: performance.length > 0 ? 
              Math.round((performance.reduce((sum, perf) => sum + perf.avg_satisfaction, 0) / performance.length) * 100) / 100 : 0
          }
        },
        message: 'Doctor performance metrics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDoctorPerformance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve doctor performance metrics',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get system metrics
   * GET /api/analytics/system/metrics
   */
  getSystemMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metricName = req.query.metricName as string;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;

      const metrics = await this.analyticsService.getSystemMetrics(metricName, hours);

      res.status(200).json({
        success: true,
        data: {
          metrics: metrics,
          period: `${hours} hours`,
          summary: {
            total_metrics: metrics.length,
            total_data_points: metrics.reduce((sum, metric) => sum + metric.count, 0)
          }
        },
        message: 'System metrics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSystemMetrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system metrics',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get appointment statistics
   * GET /api/analytics/appointments/stats
   */
  getAppointmentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const stats = await this.analyticsService.getAppointmentStats(days);

      res.status(200).json({
        success: true,
        data: {
          statistics: stats,
          period: `${days} days`,
          summary: {
            total_days: stats.length,
            total_appointments: stats.reduce((sum: number, stat: any) => sum + parseInt(stat.total_appointments), 0),
            total_revenue: stats.reduce((sum: number, stat: any) => sum + parseFloat(stat.total_revenue || 0), 0),
            avg_appointments_per_day: stats.length > 0 ? 
              Math.round(stats.reduce((sum: number, stat: any) => sum + parseInt(stat.total_appointments), 0) / stats.length) : 0
          }
        },
        message: 'Appointment statistics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAppointmentStats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve appointment statistics',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get dashboard summary
   * GET /api/analytics/dashboard
   */
  getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = await this.analyticsService.getDashboardSummary();

      res.status(200).json({
        success: true,
        data: {
          summary: summary,
          period: 'Current month',
          generated_at: new Date().toISOString()
        },
        message: 'Dashboard summary retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDashboardSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard summary',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Refresh analytics views
   * POST /api/analytics/refresh
   */
  refreshViews = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.analyticsService.refreshViews();

      res.status(200).json({
        success: true,
        data: null,
        message: 'Analytics views refreshed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in refreshViews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh analytics views',
        timestamp: new Date().toISOString()
      });
    }
  };
}

