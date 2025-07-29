import { Request, Response } from 'express';
import { DoctorService, DoctorFilters } from '../services/DoctorService';
import {
  createSuccessResponse,
  createErrorResponse,
  calculatePagination,
  logger
} from '@hospital/shared';

export class DoctorController {
  private doctorService: DoctorService;

  constructor() {
    this.doctorService = new DoctorService();
  }

  // Get doctor by ID
  getDoctorById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const doctor = await this.doctorService.getDoctorById(id);
      
      if (!doctor) {
        res.status(404).json(createErrorResponse('Doctor not found'));
        return;
      }

      res.json(createSuccessResponse(doctor));
    } catch (error) {
      logger.error('Get doctor by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get doctor by user ID
  getDoctorByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const doctor = await this.doctorService.getDoctorByUserId(userId);
      
      if (!doctor) {
        res.status(404).json(createErrorResponse('Doctor not found'));
        return;
      }

      res.json(createSuccessResponse(doctor));
    } catch (error) {
      logger.error('Get doctor by user ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get all doctors with filtering and pagination
  getAllDoctors = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters: DoctorFilters = {
        specialization: req.query.specialization as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        maxConsultationFee: req.query.maxConsultationFee ? parseFloat(req.query.maxConsultationFee as string) : undefined,
        isAcceptingPatients: req.query.isAcceptingPatients ? req.query.isAcceptingPatients === 'true' : undefined,
        search: req.query.search as string
      };

      const result = await this.doctorService.getAllDoctors(page, limit, filters);
      
      const pagination = calculatePagination(page, limit, result.total);

      res.json(createSuccessResponse({
        doctors: result.doctors,
        pagination
      }));
    } catch (error) {
      logger.error('Get all doctors error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get available doctors for appointments
  getAvailableDoctors = async (req: Request, res: Response): Promise<void> => {
    try {
      const specialization = req.query.specialization as string;
      const date = req.query.date as string;

      const doctors = await this.doctorService.getAvailableDoctors(specialization, date);

      res.json(createSuccessResponse({
        doctors,
        count: doctors.length
      }));
    } catch (error) {
      logger.error('Get available doctors error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get doctors by specialization
  getDoctorsBySpecialization = async (req: Request, res: Response): Promise<void> => {
    try {
      const { specialization } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: DoctorFilters = {
        specialization,
        isAcceptingPatients: true
      };

      const result = await this.doctorService.getAllDoctors(page, limit, filters);
      
      const pagination = calculatePagination(page, limit, result.total);

      res.json(createSuccessResponse({
        doctors: result.doctors,
        pagination,
        specialization
      }));
    } catch (error) {
      logger.error('Get doctors by specialization error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Search doctors
  searchDoctors = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query: searchQuery } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!searchQuery || typeof searchQuery !== 'string') {
        res.status(400).json(createErrorResponse('Search query is required'));
        return;
      }

      const filters: DoctorFilters = {
        search: searchQuery,
        isAcceptingPatients: true
      };

      const result = await this.doctorService.getAllDoctors(page, limit, filters);
      
      const pagination = calculatePagination(page, limit, result.total);

      res.json(createSuccessResponse({
        doctors: result.doctors,
        pagination,
        searchQuery
      }));
    } catch (error) {
      logger.error('Search doctors error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Sync doctor data from auth service (webhook endpoint)
  syncDoctorData = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorData = req.body;

      // Validate required fields
      if (!doctorData.id || !doctorData.userId || !doctorData.specialization) {
        res.status(400).json(createErrorResponse('Missing required doctor data'));
        return;
      }

      const success = await this.doctorService.syncDoctorData(doctorData);

      if (!success) {
        res.status(500).json(createErrorResponse('Failed to sync doctor data'));
        return;
      }

      res.json(createSuccessResponse(null, 'Doctor data synced successfully'));
    } catch (error) {
      logger.error('Sync doctor data error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get top rated doctors
  getTopRatedDoctors = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const specialization = req.query.specialization as string;

      const filters: DoctorFilters = {
        specialization,
        minRating: 4.0, // Only doctors with rating >= 4.0
        isAcceptingPatients: true
      };

      const result = await this.doctorService.getAllDoctors(1, limit, filters);

      res.json(createSuccessResponse({
        doctors: result.doctors,
        count: result.doctors.length
      }));
    } catch (error) {
      logger.error('Get top rated doctors error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get doctors with consultation fee range
  getDoctorsByFeeRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const minFee = req.query.minFee ? parseFloat(req.query.minFee as string) : undefined;
      const maxFee = req.query.maxFee ? parseFloat(req.query.maxFee as string) : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: DoctorFilters = {
        maxConsultationFee: maxFee,
        isAcceptingPatients: true
      };

      const result = await this.doctorService.getAllDoctors(page, limit, filters);
      
      // Filter by minimum fee if provided (since we don't have minConsultationFee in filters)
      let filteredDoctors = result.doctors;
      if (minFee !== undefined) {
        filteredDoctors = result.doctors.filter(doctor => 
          doctor.consultationFee !== undefined && doctor.consultationFee >= minFee
        );
      }

      const pagination = calculatePagination(page, limit, filteredDoctors.length);

      res.json(createSuccessResponse({
        doctors: filteredDoctors,
        pagination,
        feeRange: { minFee, maxFee }
      }));
    } catch (error) {
      logger.error('Get doctors by fee range error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
