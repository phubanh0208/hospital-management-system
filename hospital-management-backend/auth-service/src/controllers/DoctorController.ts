import { Request, Response } from 'express';
import { DoctorService, CreateDoctorProfileData, UpdateDoctorProfileData, DoctorFilters } from '../services/DoctorService';
import {
  createSuccessResponse,
  createErrorResponse,
  calculatePagination,
  logger
} from '@hospital/shared';
import { AuthenticatedRequest } from '../middleware/auth';

export class DoctorController {
  private doctorService: DoctorService;

  constructor() {
    this.doctorService = new DoctorService();
  }

  // Get current doctor's profile
  getMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      // Check if user is a doctor
      if (req.user?.role !== 'doctor') {
        res.status(403).json(createErrorResponse('Access denied. Doctor role required.'));
        return;
      }

      const doctorProfile = await this.doctorService.getDoctorProfileByUserId(userId);
      
      if (!doctorProfile) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(doctorProfile));
    } catch (error) {
      logger.error('Get my doctor profile error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get doctor profile by user ID
  getDoctorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const doctorProfile = await this.doctorService.getDoctorProfileByUserId(userId);
      
      if (!doctorProfile) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(doctorProfile));
    } catch (error) {
      logger.error('Get doctor profile error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Get doctor profile by profile ID
  getDoctorById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const doctorProfile = await this.doctorService.getDoctorProfileById(id);
      
      if (!doctorProfile) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(doctorProfile));
    } catch (error) {
      logger.error('Get doctor by ID error:', error);
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

  // Create doctor profile
  createDoctorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const profileData: CreateDoctorProfileData = req.body;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      // Check if user is a doctor or admin
      if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
        res.status(403).json(createErrorResponse('Access denied. Doctor or admin role required.'));
        return;
      }

      // If admin is creating for another user, use the provided userId
      // If doctor is creating their own profile, use their userId
      const targetUserId = req.user?.role === 'admin' && profileData.userId ? profileData.userId : userId;

      // Validate required fields
      if (!profileData.specialization || !profileData.licenseNumber) {
        res.status(400).json(createErrorResponse('Specialization and license number are required'));
        return;
      }

      const doctorProfileData: CreateDoctorProfileData = {
        ...profileData,
        userId: targetUserId
      };

      const newProfile = await this.doctorService.createDoctorProfile(doctorProfileData);
      
      if (!newProfile) {
        res.status(400).json(createErrorResponse('Failed to create doctor profile'));
        return;
      }

      res.status(201).json(createSuccessResponse(newProfile, 'Doctor profile created successfully'));
    } catch (error) {
      logger.error('Create doctor profile error:', error);
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json(createErrorResponse(error.message));
          return;
        }
        if (error.message.includes('not found') || error.message.includes('must have doctor role')) {
          res.status(400).json(createErrorResponse(error.message));
          return;
        }
      }
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Update doctor profile
  updateDoctorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { userId: targetUserId } = req.params;
      const updateData: UpdateDoctorProfileData = req.body;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      // Check permissions: doctors can only update their own profile, admins can update any
      if (req.user?.role !== 'admin' && userId !== targetUserId) {
        res.status(403).json(createErrorResponse('Access denied. You can only update your own profile.'));
        return;
      }

      const updatedProfile = await this.doctorService.updateDoctorProfile(targetUserId, updateData);
      
      if (!updatedProfile) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(updatedProfile, 'Doctor profile updated successfully'));
    } catch (error) {
      logger.error('Update doctor profile error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message));
        return;
      }
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Update my doctor profile (for authenticated doctors)
  updateMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const updateData: UpdateDoctorProfileData = req.body;

      if (!userId) {
        res.status(401).json(createErrorResponse('User not authenticated'));
        return;
      }

      // Check if user is a doctor
      if (req.user?.role !== 'doctor') {
        res.status(403).json(createErrorResponse('Access denied. Doctor role required.'));
        return;
      }

      const updatedProfile = await this.doctorService.updateDoctorProfile(userId, updateData);
      
      if (!updatedProfile) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(updatedProfile, 'Doctor profile updated successfully'));
    } catch (error) {
      logger.error('Update my doctor profile error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse(error.message));
        return;
      }
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Delete doctor profile (admin only)
  deleteDoctorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Only admins can delete doctor profiles
      if (req.user?.role !== 'admin') {
        res.status(403).json(createErrorResponse('Access denied. Admin role required.'));
        return;
      }

      const success = await this.doctorService.deleteDoctorProfile(userId);
      
      if (!success) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(null, 'Doctor profile deleted successfully'));
    } catch (error) {
      logger.error('Delete doctor profile error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // Update doctor rating (for internal use, typically called after patient reviews)
  updateDoctorRating = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { rating } = req.body;

      if (!rating || rating < 0 || rating > 5) {
        res.status(400).json(createErrorResponse('Rating must be between 0 and 5'));
        return;
      }

      const success = await this.doctorService.updateDoctorRating(userId, rating);
      
      if (!success) {
        res.status(404).json(createErrorResponse('Doctor profile not found'));
        return;
      }

      res.json(createSuccessResponse(null, 'Doctor rating updated successfully'));
    } catch (error) {
      logger.error('Update doctor rating error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
