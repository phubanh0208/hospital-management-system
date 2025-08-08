import { Router } from 'express';
import { MedicationController } from '../controllers/MedicationController';

const router = Router();
const medicationController = new MedicationController();

// Medication routes
router.get('/', medicationController.getAllMedications);
router.get('/search/:searchTerm', medicationController.searchMedications);
router.get('/code/:medicationCode', medicationController.getMedicationByCode);
router.get('/:id', medicationController.getMedicationById);
router.post('/', medicationController.createMedication);
router.put('/:id', medicationController.updateMedication);
router.delete('/:id', medicationController.deleteMedication);

export default router;
