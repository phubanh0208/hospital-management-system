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
router.get('/dashboard/doctor/:doctorId', analyticsController.getDoctorDashboard);
router.get('/dashboard/admin', analyticsController.getAdminDashboard);

// Doctor-specific Analytics Routes
router.get('/doctors/:doctorId/patients', analyticsController.getDoctorPatients);
router.get('/doctors/:doctorId/appointments/trends', analyticsController.getDoctorAppointmentTrends);

// Utility Routes
router.post('/refresh', analyticsController.refreshViews);

// Test prescription data endpoint
router.get('/test-prescriptions', async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get('http://prescription-service:3004/api/prescriptions', { timeout: 5000 });
    res.json({
      success: true,
      status: response.status,
      dataKeys: Object.keys(response.data || {}),
      prescriptionCount: response.data?.data?.prescriptions?.length || 0,
      samplePrescription: response.data?.data?.prescriptions?.[0] || null
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

export default router;

