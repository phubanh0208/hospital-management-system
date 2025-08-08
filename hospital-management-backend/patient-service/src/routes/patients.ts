import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';
import { authenticate, authorize } from '@hospital/shared';

const router = Router();
const patientController = new PatientController();

// Apply authentication to all routes
// router.use(authenticate); // TODO: Enable when auth integration is ready

// Patient CRUD routes
router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.get('/code/:code', patientController.getPatientByCode);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

// Medical history routes
router.get('/:id/medical-history', patientController.getMedicalHistory);
router.post('/:id/medical-history', patientController.addMedicalHistory);

// Visit summary route
router.get('/:id/visit-summary', patientController.getVisitSummary);

export default router;
