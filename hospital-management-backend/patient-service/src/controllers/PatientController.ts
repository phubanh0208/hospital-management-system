import { Request, Response } from 'express';
import { PatientService } from '../services/PatientService';
import { 
  createSuccessResponse, 
  createErrorResponse,
  validatePatient,
  logger
} from '@hospital/shared';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  // GET /api/patients - Get all patients with pagination
  getAllPatients = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string || 'desc';

      const result = await this.patientService.getAllPatients({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get patients'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Patients retrieved successfully'));
    } catch (error) {
      logger.error('Get all patients error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/patients/:id - Get patient by ID
  getPatientById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.patientService.getPatientById(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get patient'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Patient retrieved successfully'));
    } catch (error) {
      logger.error('Get patient by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/patients/code/:code - Get patient by code
  getPatientByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const result = await this.patientService.getPatientByCode(code);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get patient'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Patient retrieved successfully'));
    } catch (error) {
      logger.error('Get patient by code error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/patients - Create new patient
  createPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientData = req.body;

      // Validate patient data
      const validationErrors = validatePatient(patientData);
      if (validationErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', validationErrors));
        return;
      }

      // Get user ID from authenticated request (set by API Gateway auth middleware)
      const user = (req as any).user;
      let userId = user?.id;
      
      // Fallback: try to get user ID from headers (for API Gateway forwarding)
      if (!userId) {
        userId = req.headers['x-user-id'] as string;
      }
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.patientService.createPatient({
        ...patientData,
        createdByUserId: userId
      });
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to create patient'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Patient created successfully'));
    } catch (error) {
      logger.error('Create patient error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/patients/:id - Update patient
  updatePatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const patientData = req.body;

      // Validate patient data
      const validationErrors = validatePatient(patientData, true); // partial validation for update
      if (validationErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', validationErrors));
        return;
      }

      const result = await this.patientService.updatePatient(id, patientData);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update patient'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Patient updated successfully'));
    } catch (error) {
      logger.error('Update patient error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/patients/:id - Delete patient (soft delete)
  deletePatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.patientService.deletePatient(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to delete patient'));
        return;
      }

      res.json(createSuccessResponse(null, 'Patient deleted successfully'));
    } catch (error) {
      logger.error('Delete patient error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/patients/:id/medical-history - Get patient medical history
  getMedicalHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.patientService.getMedicalHistory(id);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get medical history'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Medical history retrieved successfully'));
    } catch (error) {
      logger.error('Get medical history error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/patients/:id/medical-history - Add medical history entry
  addMedicalHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const historyData = req.body;

      const result = await this.patientService.addMedicalHistory(id, historyData);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to add medical history'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Medical history added successfully'));
    } catch (error) {
      logger.error('Add medical history error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/patients/:id/visit-summary - Get patient visit summary
  getVisitSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.patientService.getVisitSummary(id);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get visit summary'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Visit summary retrieved successfully'));
    } catch (error) {
      logger.error('Get visit summary error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
