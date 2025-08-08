import { Request, Response } from 'express';
import { NotificationService, CreateNotificationData } from '../services/NotificationService';
import { logger, createSuccessResponse, createErrorResponse } from '@hospital/shared';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // GET /api/notifications
  public getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId) {
        res.status(400).json(createErrorResponse('User ID is required'));
        return;
      }

      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
        priority: req.query.priority as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.notificationService.getNotifications(userId, filters);

      res.json(createSuccessResponse(result, 'Notifications retrieved successfully'));
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json(createErrorResponse('Failed to retrieve notifications'));
    }
  };

  // POST /api/notifications
  public createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationData: CreateNotificationData = req.body;

      // Validate required fields
      if (!notificationData.recipient_user_id || !notificationData.title || !notificationData.message || !notificationData.type) {
        res.status(400).json(createErrorResponse('Missing required fields: recipient_user_id, title, message, type'));
        return;
      }

      const notification = await this.notificationService.createNotification(notificationData);

      res.status(201).json(createSuccessResponse(notification, 'Notification created successfully'));
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json(createErrorResponse('Failed to create notification'));
    }
  };

  // PUT /api/notifications/:id/read
  public markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationId = req.params.id;
      const userId = req.body.userId || req.query.userId as string;

      if (!userId) {
        res.status(400).json(createErrorResponse('User ID is required'));
        return;
      }

      const success = await this.notificationService.markAsRead(notificationId, userId);

      if (!success) {
        res.status(404).json(createErrorResponse('Notification not found or unauthorized'));
        return;
      }

      res.json(createSuccessResponse({ notificationId, status: 'read' }, 'Notification marked as read'));
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json(createErrorResponse('Failed to mark notification as read'));
    }
  };

  // DELETE /api/notifications/:id
  public deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationId = req.params.id;
      const userId = req.body.userId || req.query.userId as string;

      if (!userId) {
        res.status(400).json(createErrorResponse('User ID is required'));
        return;
      }

      const success = await this.notificationService.deleteNotification(notificationId, userId);

      if (!success) {
        res.status(404).json(createErrorResponse('Notification not found or unauthorized'));
        return;
      }

      res.json(createSuccessResponse({ notificationId }, 'Notification deleted successfully'));
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json(createErrorResponse('Failed to delete notification'));
    }
  };

  // GET /api/notifications/unread-count
  public getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).json(createErrorResponse('User ID is required'));
        return;
      }

      const count = await this.notificationService.getUnreadCount(userId);

      res.json(createSuccessResponse({ unreadCount: count }, 'Unread count retrieved successfully'));
    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json(createErrorResponse('Failed to get unread count'));
    }
  };

  // POST /api/notifications/send-appointment-reminder
  public sendAppointmentReminder = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        recipient_user_id,
        patient_name,
        doctor_name,
        appointment_date,
        appointment_time,
        appointment_number,
        room_number,
        reason
      } = req.body;

      if (!recipient_user_id || !patient_name || !doctor_name || !appointment_date || !appointment_time) {
        res.status(400).json(createErrorResponse('Missing required fields for appointment reminder'));
        return;
      }

      const notificationData: CreateNotificationData = {
        recipient_user_id,
        recipient_type: 'patient',
        title: 'Nhắc nhở lịch khám',
        message: `Bạn có lịch khám vào ${appointment_date} lúc ${appointment_time} với ${doctor_name}`,
        type: 'appointment',
        priority: 'normal',
        channels: ['web', 'email', 'sms'],
        template_name: 'appointment_reminder',
        template_variables: {
          patient_name,
          doctor_name,
          appointment_date,
          appointment_time,
          appointment_number: appointment_number || 'N/A',
          room_number: room_number || 'N/A',
          reason: reason || 'Khám tổng quát'
        }
      };

      const notification = await this.notificationService.createNotification(notificationData);

      res.status(201).json(createSuccessResponse(notification, 'Appointment reminder sent successfully'));
    } catch (error) {
      logger.error('Error sending appointment reminder:', error);
      res.status(500).json(createErrorResponse('Failed to send appointment reminder'));
    }
  };

  // POST /api/notifications/send-prescription-ready
  public sendPrescriptionReady = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        recipient_user_id,
        patient_name,
        doctor_name,
        prescription_number,
        issued_date,
        total_cost
      } = req.body;

      if (!recipient_user_id || !patient_name || !prescription_number) {
        res.status(400).json(createErrorResponse('Missing required fields for prescription ready notification'));
        return;
      }

      const notificationData: CreateNotificationData = {
        recipient_user_id,
        recipient_type: 'patient',
        title: 'Đơn thuốc sẵn sàng',
        message: `Đơn thuốc ${prescription_number} của bạn đã sẵn sàng để lấy`,
        type: 'prescription',
        priority: 'high',
        channels: ['web', 'email', 'sms'],
        template_name: 'prescription_ready',
        template_variables: {
          patient_name,
          doctor_name: doctor_name || 'N/A',
          prescription_number,
          issued_date: issued_date || new Date().toLocaleDateString('vi-VN'),
          total_cost: total_cost || '0'
        }
      };

      const notification = await this.notificationService.createNotification(notificationData);

      res.status(201).json(createSuccessResponse(notification, 'Prescription ready notification sent successfully'));
    } catch (error) {
      logger.error('Error sending prescription ready notification:', error);
      res.status(500).json(createErrorResponse('Failed to send prescription ready notification'));
    }
  };

  // POST /api/notifications/cleanup-expired
  public cleanupExpired = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedCount = await this.notificationService.cleanupExpiredNotifications();

      res.json(createSuccessResponse(
        { deletedCount }, 
        `Cleaned up ${deletedCount} expired notifications`
      ));
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      res.status(500).json(createErrorResponse('Failed to cleanup expired notifications'));
    }
  };
}
