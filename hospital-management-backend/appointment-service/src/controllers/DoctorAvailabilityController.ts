import { Request, Response } from 'express';
import { DoctorAvailabilityService } from '../services/DoctorAvailabilityService';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logger
} from '@hospital/shared';

export class DoctorAvailabilityController {
  private doctorAvailabilityService: DoctorAvailabilityService;

  constructor() {
    this.doctorAvailabilityService = new DoctorAvailabilityService();
  }

  // GET /api/doctor-availability - Get all doctor availability or filter by doctorId
  getDoctorAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = req.query.doctorId as string;

      const result = await this.doctorAvailabilityService.getDoctorAvailability(doctorId);

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get doctor availability'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Doctor availability retrieved successfully'));
    } catch (error) {
      logger.error('Get doctor availability error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/doctor-availability/doctor/:doctorId/day/:dayOfWeek - Get availability by day
  getDoctorAvailabilityByDay = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, dayOfWeek } = req.params;
      const day = parseInt(dayOfWeek);

      if (isNaN(day) || day < 0 || day > 6) {
        res.status(400).json(createErrorResponse('Invalid day of week. Must be 0-6 (0=Sunday)'));
        return;
      }

      const result = await this.doctorAvailabilityService.getDoctorAvailabilityByDay(doctorId, day);

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get doctor availability'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Doctor availability retrieved successfully'));
    } catch (error) {
      logger.error('Get doctor availability by day error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/doctor-availability - Create new doctor availability
  createDoctorAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, dayOfWeek, startTime, endTime, isAvailable } = req.body;

      // Validate required fields
      if (!doctorId || dayOfWeek === undefined || !startTime || !endTime) {
        res.status(400).json(createErrorResponse('Missing required fields: doctorId, dayOfWeek, startTime, endTime'));
        return;
      }

      // Validate dayOfWeek
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        res.status(400).json(createErrorResponse('Invalid day of week. Must be 0-6 (0=Sunday)'));
        return;
      }

      // Validate time format (basic check)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        res.status(400).json(createErrorResponse('Invalid time format. Use HH:MM format'));
        return;
      }

      const result = await this.doctorAvailabilityService.createDoctorAvailability({
        doctorId,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to create doctor availability'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Doctor availability created successfully'));
    } catch (error) {
      logger.error('Create doctor availability error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/doctor-availability/:id - Update doctor availability
  updateDoctorAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate dayOfWeek if provided
      if (updateData.dayOfWeek !== undefined) {
        if (updateData.dayOfWeek < 0 || updateData.dayOfWeek > 6) {
          res.status(400).json(createErrorResponse('Invalid day of week. Must be 0-6 (0=Sunday)'));
          return;
        }
      }

      // Validate time format if provided
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
        res.status(400).json(createErrorResponse('Invalid start time format. Use HH:MM format'));
        return;
      }
      if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
        res.status(400).json(createErrorResponse('Invalid end time format. Use HH:MM format'));
        return;
      }

      const result = await this.doctorAvailabilityService.updateDoctorAvailability(id, updateData);

      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update doctor availability'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Doctor availability updated successfully'));
    } catch (error) {
      logger.error('Update doctor availability error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/doctor-availability/:id - Delete doctor availability
  deleteDoctorAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.doctorAvailabilityService.deleteDoctorAvailability(id);

      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to delete doctor availability'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Doctor availability deleted successfully'));
    } catch (error) {
      logger.error('Delete doctor availability error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
