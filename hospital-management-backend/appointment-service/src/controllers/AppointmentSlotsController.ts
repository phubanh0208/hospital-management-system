import { Request, Response } from 'express';
import { AppointmentSlotsService } from '../services/AppointmentSlotsService';
import { 
  createSuccessResponse, 
  createErrorResponse,
  logger
} from '@hospital/shared';

export class AppointmentSlotsController {
  private appointmentSlotsService: AppointmentSlotsService;

  constructor() {
    this.appointmentSlotsService = new AppointmentSlotsService();
  }

  // GET /api/appointment-slots - Get all slots with filtering
  getAllSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = req.query.doctorId as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const result = await this.appointmentSlotsService.getAllSlots(doctorId, dateFrom, dateTo);

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get appointment slots'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment slots retrieved successfully'));
    } catch (error) {
      logger.error('Get all slots error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointment-slots/available/:doctorId/:date - Get available slots for specific doctor and date
  getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, date } = req.params;

      // Validate date format (basic check)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        res.status(400).json(createErrorResponse('Invalid date format. Use YYYY-MM-DD format'));
        return;
      }

      const result = await this.appointmentSlotsService.getAvailableSlots(doctorId, date);

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get available slots'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Available slots retrieved successfully'));
    } catch (error) {
      logger.error('Get available slots error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/appointment-slots - Create new appointment slot
  createAppointmentSlot = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, slotDate, slotTime, durationMinutes, maxBookings } = req.body;

      // Validate required fields
      if (!doctorId || !slotDate || !slotTime) {
        res.status(400).json(createErrorResponse('Missing required fields: doctorId, slotDate, slotTime'));
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(slotDate)) {
        res.status(400).json(createErrorResponse('Invalid date format. Use YYYY-MM-DD format'));
        return;
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slotTime)) {
        res.status(400).json(createErrorResponse('Invalid time format. Use HH:MM format'));
        return;
      }

      const result = await this.appointmentSlotsService.createAppointmentSlot({
        doctorId,
        slotDate,
        slotTime,
        durationMinutes,
        maxBookings
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to create appointment slot'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Appointment slot created successfully'));
    } catch (error) {
      logger.error('Create appointment slot error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/appointment-slots/:id - Update appointment slot
  updateAppointmentSlot = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate date format if provided
      if (updateData.slotDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(updateData.slotDate)) {
          res.status(400).json(createErrorResponse('Invalid date format. Use YYYY-MM-DD format'));
          return;
        }
      }

      // Validate time format if provided
      if (updateData.slotTime) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(updateData.slotTime)) {
          res.status(400).json(createErrorResponse('Invalid time format. Use HH:MM format'));
          return;
        }
      }

      const result = await this.appointmentSlotsService.updateAppointmentSlot(id, updateData);

      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update appointment slot'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment slot updated successfully'));
    } catch (error) {
      logger.error('Update appointment slot error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/appointment-slots/:id - Delete appointment slot
  deleteAppointmentSlot = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.appointmentSlotsService.deleteAppointmentSlot(id);

      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to delete appointment slot'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment slot deleted successfully'));
    } catch (error) {
      logger.error('Delete appointment slot error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/appointment-slots/generate - Generate slots for doctor
  generateSlotsForDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, dateFrom, dateTo } = req.body;

      // Validate required fields
      if (!doctorId || !dateFrom || !dateTo) {
        res.status(400).json(createErrorResponse('Missing required fields: doctorId, dateFrom, dateTo'));
        return;
      }

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
        res.status(400).json(createErrorResponse('Invalid date format. Use YYYY-MM-DD format'));
        return;
      }

      // Validate date range
      if (new Date(dateFrom) > new Date(dateTo)) {
        res.status(400).json(createErrorResponse('dateFrom cannot be later than dateTo'));
        return;
      }

      const result = await this.appointmentSlotsService.generateSlotsForDoctor(doctorId, dateFrom, dateTo);

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to generate slots'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, result.message || 'Slots generated successfully'));
    } catch (error) {
      logger.error('Generate slots error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
