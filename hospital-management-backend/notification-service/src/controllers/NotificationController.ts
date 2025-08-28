import { Request, Response, NextFunction } from 'express';
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
      // Get user ID from authenticated request (set by API Gateway auth middleware)
      const user = (req as any).user;
      const userId = user?.id || (req.query.userId as string);

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

  // GET /api/notifications/:id
  public getNotificationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id);

      if (!notification) {
        res.status(404).json(createErrorResponse('Notification not found'));
        return;
      }

      res.json(createSuccessResponse(notification, 'Notification retrieved successfully'));
    } catch (error) {
      logger.error(`Error getting notification ${req.params.id}:`, error);
      res.status(500).json(createErrorResponse('Failed to retrieve notification'));
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

  // ========== ASYNC ENDPOINTS ==========

  // POST /api/notifications/async
  public createNotificationAsync = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationData: CreateNotificationData = req.body;

      // Validate required fields
      if (!notificationData.recipient_user_id || !notificationData.title || !notificationData.message || !notificationData.type) {
        res.status(400).json(createErrorResponse('Missing required fields: recipient_user_id, title, message, type'));
        return;
      }

      const notification = await this.notificationService.createNotificationAsync(notificationData);

      res.status(202).json(createSuccessResponse(
        {
          notificationId: notification.id,
          status: 'queued',
          message: 'Notification queued for async processing'
        },
        'Notification queued successfully'
      ));
    } catch (error) {
      logger.error('Error creating async notification:', error);
      res.status(500).json(createErrorResponse('Failed to queue notification'));
    }
  };

  // POST /api/notifications/queue/appointment-reminder
  public queueAppointmentReminder = async (req: Request, res: Response): Promise<void> => {
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

      await this.notificationService.queueAppointmentReminder({
        recipient_user_id,
        patient_name,
        doctor_name,
        appointment_date,
        appointment_time,
        appointment_number,
        room_number,
        reason
      });

      res.status(202).json(createSuccessResponse(
        {
          status: 'queued',
          message: 'Appointment reminder queued for processing'
        },
        'Appointment reminder queued successfully'
      ));
    } catch (error) {
      logger.error('Error queuing appointment reminder:', error);
      res.status(500).json(createErrorResponse('Failed to queue appointment reminder'));
    }
  };

  // POST /api/notifications/queue/prescription-ready
  public queuePrescriptionReady = async (req: Request, res: Response): Promise<void> => {
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

      await this.notificationService.queuePrescriptionReady({
        recipient_user_id,
        patient_name,
        doctor_name,
        prescription_number,
        issued_date,
        total_cost
      });

      res.status(202).json(createSuccessResponse(
        {
          status: 'queued',
          message: 'Prescription ready notification queued for processing'
        },
        'Prescription ready notification queued successfully'
      ));
    } catch (error) {
      logger.error('Error queuing prescription ready notification:', error);
      res.status(500).json(createErrorResponse('Failed to queue prescription ready notification'));
    }
  };

  // POST /api/notifications/queue/system-alert
  public queueSystemAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        recipient_user_id,
        title,
        message,
        priority,
        alert_type
      } = req.body;

      if (!title || !message || !priority || !alert_type) {
        res.status(400).json(createErrorResponse('Missing required fields: title, message, priority, alert_type'));
        return;
      }

      await this.notificationService.queueSystemAlert({
        recipient_user_id,
        title,
        message,
        priority,
        alert_type
      });

      res.status(202).json(createSuccessResponse(
        {
          status: 'queued',
          message: 'System alert queued for processing'
        },
        'System alert queued successfully'
      ));
    } catch (error) {
      logger.error('Error queuing system alert:', error);
      res.status(500).json(createErrorResponse('Failed to queue system alert'));
    }
  };

  // POST /api/notifications/queue/bulk
  public queueBulkNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        recipient_user_ids,
        title,
        message,
        notification_type,
        priority,
        channels,
        template_name,
        template_variables
      } = req.body;

      if (!recipient_user_ids || !Array.isArray(recipient_user_ids) || recipient_user_ids.length === 0) {
        res.status(400).json(createErrorResponse('recipient_user_ids must be a non-empty array'));
        return;
      }

      if (!title || !message || !notification_type) {
        res.status(400).json(createErrorResponse('Missing required fields: title, message, notification_type'));
        return;
      }

      await this.notificationService.queueBulkNotification({
        recipient_user_ids,
        title,
        message,
        notification_type,
        priority,
        channels,
        template_name,
        template_variables
      });

      res.status(202).json(createSuccessResponse(
        {
          status: 'queued',
          recipientCount: recipient_user_ids.length,
          message: 'Bulk notification queued for processing'
        },
        'Bulk notification queued successfully'
      ));
    } catch (error) {
      logger.error('Error queuing bulk notification:', error);
      res.status(500).json(createErrorResponse('Failed to queue bulk notification'));
    }
  };

  // ========== ADMIN ENDPOINTS ==========

  // GET /api/notifications/admin/retry-stats
  public getRetryStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const timeframe = req.query.timeframe as string || '24 hours';
      const retryService = this.notificationService.getRetryService();
      const stats = await retryService.getRetryStatistics(timeframe);

      res.json(createSuccessResponse(stats, `Retry statistics for the last ${timeframe} retrieved successfully`));
    } catch (error) {
      logger.error('Error getting retry statistics:', error);
      res.status(500).json(createErrorResponse('Failed to retrieve retry statistics'));
    }
  };

  // POST /api/notifications/admin/process-retries
  public processRetries = async (req: Request, res: Response): Promise<void> => {
    try {
      const retryService = this.notificationService.getRetryService();
      await retryService.processRetries();

      res.json(createSuccessResponse(
        { status: 'completed', message: 'Retry processing triggered successfully' },
        'Retry processing completed'
      ));
    } catch (error) {
      logger.error('Error processing retries:', error);
      res.status(500).json(createErrorResponse('Failed to process retries'));
    }
  };

  // POST /api/notifications/admin/cleanup-retries
  public cleanupRetries = async (req: Request, res: Response): Promise<void> => {
    try {
      const olderThanDays = parseInt(req.body.olderThanDays as string) || 30;
      const retryService = this.notificationService.getRetryService();
      await retryService.cleanupOldRetries(olderThanDays);

      res.json(createSuccessResponse(
        { olderThanDays, message: `Cleanup completed for retries older than ${olderThanDays} days` },
        'Retry cleanup completed'
      ));
    } catch (error) {
      logger.error('Error cleaning up retries:', error);
      res.status(500).json(createErrorResponse('Failed to cleanup retries'));
    }
  };

  // POST /api/notifications/admin/test-notification
  public testNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        recipient_user_id,
        channels,
        title = 'Test Notification',
        message = 'This is a test notification to verify the system is working correctly.',
        type = 'system'
      } = req.body;

      if (!recipient_user_id) {
        res.status(400).json(createErrorResponse('recipient_user_id is required for test notification'));
        return;
      }

      const notificationData: CreateNotificationData = {
        recipient_user_id,
        recipient_type: 'user',
        title,
        message,
        type,
        priority: 'normal',
        channels: channels || ['web', 'email']
      };

      const notification = await this.notificationService.createNotification(notificationData);

      res.status(201).json(createSuccessResponse(
        {
          notificationId: notification.id,
          channels: notification.channels,
          status: 'sent'
        },
        'Test notification sent successfully'
      ));
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json(createErrorResponse('Failed to send test notification'));
    }
  };
}
