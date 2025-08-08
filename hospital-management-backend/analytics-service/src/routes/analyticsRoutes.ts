import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router = Router();
const analyticsController = new AnalyticsController();

// Patient Analytics Routes
router.get('/patients/monthly', analyticsController.getPatientStatsByMonth);

// Prescription Analytics Routes  
router.get('/prescriptions/reports', analyticsController.getPrescriptionReports);

// Doctor Performance Routes
router.get('/doctors/performance', analyticsController.getDoctorPerformance);

// System Metrics Routes
router.get('/system/metrics', analyticsController.getSystemMetrics);

// Appointment Analytics Routes
router.get('/appointments/stats', analyticsController.getAppointmentStats);

// Dashboard Routes
router.get('/dashboard', analyticsController.getDashboardSummary);

// Utility Routes
router.post('/refresh', analyticsController.refreshViews);

export default router;

