import { Request, Response } from 'express';
import { AppointmentService } from '../services/AppointmentService';
import {
  createSuccessResponse,
  createErrorResponse,
  validateAppointment,
  logger
} from '@hospital/shared';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  // GET /api/appointments - Get all appointments with filtering
  getAllAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const doctorId = req.query.doctorId as string;
      const patientId = req.query.patientId as string;
      const status = req.query.status as string;
      const appointmentType = req.query.appointmentType as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const sortBy = req.query.sortBy as string || 'scheduled_date';
      const sortOrder = req.query.sortOrder as string || 'asc';

      const result = await this.appointmentService.getAllAppointments({
        page,
        limit,
        search,
        doctorId,
        patientId,
        status,
        appointmentType,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get appointments'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointments retrieved successfully'));
    } catch (error) {
      logger.error('Get all appointments error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointments/:id - Get appointment by ID
  getAppointmentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.appointmentService.getAppointmentById(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment retrieved successfully'));
    } catch (error) {
      logger.error('Get appointment by ID error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointments/number/:appointmentNumber - Get appointment by number
  getAppointmentByNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentNumber } = req.params;

      const result = await this.appointmentService.getAppointmentByNumber(appointmentNumber);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to get appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment retrieved successfully'));
    } catch (error) {
      logger.error('Get appointment by number error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // POST /api/appointments - Create new appointment
  createAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentData = req.body;

      // Validate appointment data
      const validationErrors = validateAppointment(appointmentData);
      if (validationErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', validationErrors));
        return;
      }

      // TODO: Get user ID from JWT token
      const createdByUserId = req.body.createdByUserId || 'temp-user-id';

      const result = await this.appointmentService.createAppointment({
        ...appointmentData,
        createdByUserId
      });
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to create appointment'));
        return;
      }

      res.status(201).json(createSuccessResponse(result.data, 'Appointment created successfully'));
    } catch (error) {
      logger.error('Create appointment error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/appointments/:id - Update appointment
  updateAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate appointment data (partial validation for update)
      const validationErrors = validateAppointment(updateData, true);
      if (validationErrors.length > 0) {
        res.status(400).json(createErrorResponse('Validation failed', validationErrors));
        return;
      }

      const result = await this.appointmentService.updateAppointment(id, updateData);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to update appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment updated successfully'));
    } catch (error) {
      logger.error('Update appointment error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // DELETE /api/appointments/:id - Cancel appointment
  cancelAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.appointmentService.cancelAppointment(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to cancel appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment cancelled successfully'));
    } catch (error) {
      logger.error('Cancel appointment error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/appointments/:id/confirm - Confirm appointment
  confirmAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.appointmentService.confirmAppointment(id);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to confirm appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment confirmed successfully'));
    } catch (error) {
      logger.error('Confirm appointment error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // PUT /api/appointments/:id/complete - Complete appointment
  completeAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { doctorNotes } = req.body;

      const result = await this.appointmentService.completeAppointment(id, doctorNotes);
      
      if (!result.success) {
        const statusCode = result.message?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(createErrorResponse(result.message || 'Failed to complete appointment'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment completed successfully'));
    } catch (error) {
      logger.error('Complete appointment error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointments/conflicts - Get appointment conflicts
  getAppointmentConflicts = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = req.query.doctorId as string;

      const result = await this.appointmentService.getAppointmentConflicts(doctorId);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get conflicts'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Appointment conflicts retrieved successfully'));
    } catch (error) {
      logger.error('Get appointment conflicts error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointments/doctor/:doctorId/schedule - Get doctor schedule
  getDoctorSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      if (!dateFrom || !dateTo) {
        res.status(400).json(createErrorResponse('dateFrom and dateTo are required'));
        return;
      }

      const result = await this.appointmentService.getDoctorSchedule(doctorId, dateFrom, dateTo);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get doctor schedule'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Doctor schedule retrieved successfully'));
    } catch (error) {
      logger.error('Get doctor schedule error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };

  // GET /api/appointments/patient/:patientId - Get patient appointments
  getPatientAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;

      const result = await this.appointmentService.getPatientAppointments(patientId);
      
      if (!result.success) {
        res.status(400).json(createErrorResponse(result.message || 'Failed to get patient appointments'));
        return;
      }

      res.json(createSuccessResponse(result.data, 'Patient appointments retrieved successfully'));
    } catch (error) {
      logger.error('Get patient appointments error:', error);
      res.status(500).json(createErrorResponse('Internal server error'));
    }
  };
}
