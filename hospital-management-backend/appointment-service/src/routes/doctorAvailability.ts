import { Router } from 'express';
import { DoctorAvailabilityController } from '../controllers/DoctorAvailabilityController';

const router = Router();
const doctorAvailabilityController = new DoctorAvailabilityController();

// Main doctor availability routes
router.get('/', doctorAvailabilityController.getDoctorAvailability);
router.post('/', doctorAvailabilityController.createDoctorAvailability);

// Specific availability routes
router.put('/:id', doctorAvailabilityController.updateDoctorAvailability);
router.delete('/:id', doctorAvailabilityController.deleteDoctorAvailability);

// Doctor specific routes
router.get('/doctor/:doctorId/day/:dayOfWeek', doctorAvailabilityController.getDoctorAvailabilityByDay);

export default router;
