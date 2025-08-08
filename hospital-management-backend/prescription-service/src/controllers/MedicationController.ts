import { Request, Response } from 'express';
import { MedicationService } from '../services/MedicationService';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logger
} from '@hospital/shared';

export class MedicationController {
  private medicationService: MedicationService;

  constructor() {
    this.medicationService = new MedicationService();
  }

  // GET /api/medications - Get all medications with filtering
  getAllMedications = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const sortBy = req.query.sortBy as string || 'medication_name';
      const sortOrder = req.query.sortOrder as string || 'asc';

      const result = await this.medicationService.getAllMedications({
        page,
        limit,
        search,
        isActive,
        sortBy,
        sortOrder
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get medications'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medications retrieved successfully'));
    } catch (error) {
      logger.error('Get all medications error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/medications/:id - Get medication by ID
  getMedicationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.medicationService.getMedicationById(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get medication'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medication retrieved successfully'));
    } catch (error) {
      logger.error('Get medication by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/medications/code/:medicationCode - Get medication by code
  getMedicationByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicationCode } = req.params;

      const result = await this.medicationService.getMedicationByCode(medicationCode);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get medication'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medication retrieved successfully'));
    } catch (error) {
      logger.error('Get medication by code error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/medications/search/:searchTerm - Search medications
  searchMedications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchTerm } = req.params;

      if (!searchTerm || searchTerm.length < 2) {
        res.status(400).json(createErrorResponse('Search term must be at least 2 characters'));
        return;
      }

      const result = await this.medicationService.searchMedications(searchTerm);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to search medications'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medications search completed'));
    } catch (error) {
      logger.error('Search medications error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/medications - Create new medication
  createMedication = async (req: Request, res: Response): Promise<void> => {
    try {
      const medicationData = req.body;

      // Basic validation
      if (!medicationData.medicationCode || !medicationData.medicationName) {
        res.status(400).json(createErrorResponse('Medication code and name are required'));
        return;
      }

      const result = await this.medicationService.createMedication(medicationData);
      
      if (!result.success) {
        const statusCode = result.message?.includes('already exists') ? 409 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to create medication'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Medication created successfully'));
    } catch (error) {
      logger.error('Create medication error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/medications/:id - Update medication
  updateMedication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await this.medicationService.updateMedication(id, updateData);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update medication'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medication updated successfully'));
    } catch (error) {
      logger.error('Update medication error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/medications/:id - Delete medication (soft delete)
  deleteMedication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.medicationService.deleteMedication(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to delete medication'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medication deleted successfully'));
    } catch (error) {
      logger.error('Delete medication error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
