import { Request, Response } from 'express';
import { PrescriptionService } from '../services/PrescriptionService';
import { 
  createSuccessResponse, 
  createErrorResponse,
  validatePrescription,
  logger
} from '@hospital/shared';

export class PrescriptionController {
  private prescriptionService: PrescriptionService;

  constructor() {
    this.prescriptionService = new PrescriptionService();
  }

  // GET /api/prescriptions - Get all prescriptions with filtering
  getAllPrescriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const doctorId = req.query.doctorId as string;
      const patientId = req.query.patientId as string;
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const sortBy = req.query.sortBy as string || 'issued_date';
      const sortOrder = req.query.sortOrder as string || 'desc';

      const result = await this.prescriptionService.getAllPrescriptions({
        page,
        limit,
        search,
        doctorId,
        patientId,
        status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get prescriptions'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Prescriptions retrieved successfully'));
    } catch (error) {
      logger.error('Get all prescriptions error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/prescriptions/:id - Get prescription by ID
  getPrescriptionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.prescriptionService.getPrescriptionById(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get prescription'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Prescription retrieved successfully'));
    } catch (error) {
      logger.error('Get prescription by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/prescriptions/number/:prescriptionNumber - Get prescription by number
  getPrescriptionByNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { prescriptionNumber } = req.params;

      const result = await this.prescriptionService.getPrescriptionByNumber(prescriptionNumber);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get prescription'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Prescription retrieved successfully'));
    } catch (error) {
      logger.error('Get prescription by number error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/prescriptions - Create new prescription
  createPrescription = async (req: Request, res: Response): Promise<void> => {
    try {
      const prescriptionData = req.body;

      // Validate prescription data
      const validationErrors = validatePrescription(prescriptionData);
      if (validationErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', validationErrors));
        return;
      }

      // Validate prescription items
      if (!prescriptionData.items || !Array.isArray(prescriptionData.items) || prescriptionData.items.length === 0) {
        res.status(400).json(createErrorResponse('At least one prescription item is required'));
        return;
      }

      // Validate each item
      for (const item of prescriptionData.items) {
        if (!item.medicationName || !item.dosage || !item.frequency || !item.duration || !item.quantity) {
          res.status(400).json(createErrorResponse('All prescription item fields are required: medicationName, dosage, frequency, duration, quantity'));
          return;
        }
      }

      const result = await this.prescriptionService.createPrescription(prescriptionData);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to create prescription'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Prescription created successfully'));
    } catch (error) {
      logger.error('Create prescription error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/prescriptions/:id - Update prescription
  updatePrescription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await this.prescriptionService.updatePrescription(id, updateData);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update prescription'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Prescription updated successfully'));
    } catch (error) {
      logger.error('Update prescription error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/prescriptions/:id - Delete prescription
  deletePrescription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.prescriptionService.deletePrescription(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to delete prescription'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Prescription deleted successfully'));
    } catch (error) {
      logger.error('Delete prescription error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };


}
// Updated: Mon, Sep  8, 2025 12:57:25 AM
