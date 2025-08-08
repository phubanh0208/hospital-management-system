import { Router } from 'express';
import { AppointmentSlotsController } from '../controllers/AppointmentSlotsController';

const router = Router();
const appointmentSlotsController = new AppointmentSlotsController();

// Main appointment slots routes
router.get('/', appointmentSlotsController.getAllSlots);
router.post('/', appointmentSlotsController.createAppointmentSlot);

// Specific slot routes
router.put('/:id', appointmentSlotsController.updateAppointmentSlot);
router.delete('/:id', appointmentSlotsController.deleteAppointmentSlot);

// Available slots route
router.get('/available/:doctorId/:date', appointmentSlotsController.getAvailableSlots);

// Generate slots route
router.post('/generate', appointmentSlotsController.generateSlotsForDoctor);

export default router;
