import { Router } from 'express';
import { PrescriptionController } from '../controllers/PrescriptionController';

const router = Router();
const prescriptionController = new PrescriptionController();

// Prescription routes
router.get('/', prescriptionController.getAllPrescriptions);
router.get('/:id', prescriptionController.getPrescriptionById);
router.get('/number/:prescriptionNumber', prescriptionController.getPrescriptionByNumber);
router.post('/', prescriptionController.createPrescription);
router.put('/:id', prescriptionController.updatePrescription);
router.delete('/:id', prescriptionController.deletePrescription);

export default router;
