import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController';


const router = Router();
const appointmentController = new AppointmentController();

// Main appointment routes
router.get('/', appointmentController.getAllAppointments);
router.post('/', appointmentController.createAppointment);
router.get('/conflicts', appointmentController.getAppointmentConflicts);

// Specific appointment routes
router.get('/:id', appointmentController.getAppointmentById);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.cancelAppointment);

// Appointment number route
router.get('/number/:appointmentNumber', appointmentController.getAppointmentByNumber);

// Appointment status management
router.put('/:id/confirm', appointmentController.confirmAppointment);
router.put('/:id/complete', appointmentController.completeAppointment);

// Doctor and patient specific routes
router.get('/doctor/:doctorId/schedule', appointmentController.getDoctorSchedule);
router.get('/patient/:patientId', appointmentController.getPatientAppointments);



export default router;
