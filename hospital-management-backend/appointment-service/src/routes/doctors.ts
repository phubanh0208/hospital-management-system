import { Router } from 'express';
import { DoctorController } from '../controllers/DoctorController';

const router = Router();
const doctorController = new DoctorController();

// Public routes (no authentication required)
router.get('/', doctorController.getAllDoctors); // Get all doctors with filtering
router.get('/available', doctorController.getAvailableDoctors); // Get available doctors for appointments
router.get('/top-rated', doctorController.getTopRatedDoctors); // Get top rated doctors
router.get('/search', doctorController.searchDoctors); // Search doctors
router.get('/fee-range', doctorController.getDoctorsByFeeRange); // Get doctors by consultation fee range
router.get('/specialization/:specialization', doctorController.getDoctorsBySpecialization); // Get doctors by specialization
router.get('/user/:userId', doctorController.getDoctorByUserId); // Get doctor by user ID
router.get('/:id', doctorController.getDoctorById); // Get doctor by ID

// Internal API routes (for service-to-service communication)
router.post('/sync', doctorController.syncDoctorData); // Sync doctor data from auth service

export default router;
