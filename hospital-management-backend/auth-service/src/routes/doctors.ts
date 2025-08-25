import { Router } from 'express';
import { DoctorController } from '../controllers/DoctorController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const doctorController = new DoctorController();

// Public routes (no authentication required)
router.get('/', doctorController.getAllDoctors); // Get all doctors with filtering
router.get('/profile/:userId', doctorController.getDoctorProfile); // Get doctor profile by user ID
router.get('/:id', doctorController.getDoctorById); // Get doctor profile by profile ID

// Protected routes (authentication required)
router.use(authenticate);

// Doctor-specific routes
router.get('/my/profile', authorize(['doctor']), doctorController.getMyProfile); // Get my doctor profile
router.post('/my/profile', authorize(['doctor']), doctorController.createDoctorProfile); // Create my doctor profile
router.put('/my/profile', authorize(['doctor']), doctorController.updateMyProfile); // Update my doctor profile

// Admin routes for doctor management
router.post('/profile', authorize(['admin']), doctorController.createDoctorProfile); // Admin create doctor profile
router.put('/profile/:userId', authorize(['admin', 'doctor']), doctorController.updateDoctorProfile); // Update doctor profile (admin or own)
router.delete('/profile/:userId', authorize(['admin']), doctorController.deleteDoctorProfile); // Admin delete doctor profile

// Internal API routes (for other services)
router.put('/rating/:userId', doctorController.updateDoctorRating); // Update doctor rating (internal use)

export default router;
