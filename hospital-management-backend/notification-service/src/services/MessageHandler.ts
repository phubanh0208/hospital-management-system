import { logger } from '@hospital/shared';
import { NotificationService, CreateNotificationData } from './NotificationService';
import { 
  RabbitMQMessage, 
  CreateNotificationMessage,
  SendNotificationMessage,
  AppointmentReminderMessage,
  PrescriptionReadyMessage,
  SystemAlertMessage,
  BulkNotificationMessage
} from '../types/MessageTypes';

export class MessageHandler {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Main message processing entry point
   */
  public async processMessage(message: RabbitMQMessage): Promise<void> {
    try {
      logger.info('Processing RabbitMQ message', {
        messageId: message.id,
        type: message.type,
        timestamp: message.timestamp
      });

      switch (message.type) {
        case 'create_notification':
          await this.handleCreateNotification(message);
          break;

        case 'send_notification':
          await this.handleSendNotification(message);
          break;

        case 'appointment_reminder':
          await this.handleAppointmentReminder(message);
          break;

        case 'prescription_ready':
          await this.handlePrescriptionReady(message);
          break;

        case 'system_alert':
          await this.handleSystemAlert(message);
          break;

        case 'bulk_notification':
          await this.handleBulkNotification(message);
          break;

        default:
          logger.warn('Unknown message type received', {
            messageId: (message as any).id,
            type: (message as any).type
          });
      }

      logger.info('Message processed successfully', {
        messageId: message.id,
        type: message.type
      });

    } catch (error) {
      logger.error('Error processing RabbitMQ message', {
        messageId: message.id,
        type: message.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw to trigger NACK
    }
  }

  /**
   * Handle create notification message
   */
  private async handleCreateNotification(message: CreateNotificationMessage): Promise<void> {
    const { data } = message;

    const notificationData: CreateNotificationData = {
      recipient_user_id: data.recipient_user_id,
      recipient_type: data.recipient_type,
      title: data.title,
      message: data.message,
      type: data.notification_type,
      priority: data.priority || 'normal',
      channels: data.channels,
      related_entity_type: data.related_entity_type,
      related_entity_id: data.related_entity_id,
      expires_at: data.expires_at,
      template_name: data.template_name,
      template_variables: data.template_variables
    };

    await this.notificationService.createNotification(notificationData);

    logger.info('Notification created from RabbitMQ message', {
      messageId: message.id,
      recipientUserId: data.recipient_user_id,
      notificationType: data.notification_type
    });
  }

  /**
   * Handle send notification message (for async sending)
   */
  private async handleSendNotification(message: SendNotificationMessage): Promise<void> {
    const { data } = message;

    await this.notificationService.sendNotification(
      data.notification_id,
      data.template_name,
      data.template_variables
    );

    logger.info('Notification sent from RabbitMQ message', {
      messageId: message.id,
      notificationId: data.notification_id
    });
  }

  /**
   * Handle appointment reminder message
   */
  private async handleAppointmentReminder(message: AppointmentReminderMessage): Promise<void> {
    const { data } = message;

    const notificationData: CreateNotificationData = {
      recipient_user_id: data.recipient_user_id,
      recipient_type: 'patient',
      title: 'Nhắc nhở lịch khám',
      message: `Bạn có lịch khám vào ${data.appointment_date} lúc ${data.appointment_time} với ${data.doctor_name}`,
      type: 'appointment',
      priority: 'normal',
      channels: ['web', 'email', 'sms'],
      template_name: 'appointment_reminder',
      template_variables: {
        patient_name: data.patient_name,
        doctor_name: data.doctor_name,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        appointment_number: data.appointment_number || 'N/A',
        room_number: data.room_number || 'N/A',
        reason: data.reason || 'Khám tổng quát'
      }
    };

    await this.notificationService.createNotification(notificationData);

    logger.info('Appointment reminder created from RabbitMQ', {
      messageId: message.id,
      patientName: data.patient_name,
      appointmentDate: data.appointment_date
    });
  }

  /**
   * Handle prescription ready message
   */
  private async handlePrescriptionReady(message: PrescriptionReadyMessage): Promise<void> {
    const { data } = message;

    const notificationData: CreateNotificationData = {
      recipient_user_id: data.recipient_user_id,
      recipient_type: 'patient',
      title: 'Đơn thuốc sẵn sàng',
      message: `Đơn thuốc ${data.prescription_number} của bạn đã sẵn sàng để lấy`,
      type: 'prescription',
      priority: 'high',
      channels: ['web', 'email', 'sms'],
      template_name: 'prescription_ready',
      template_variables: {
        patient_name: data.patient_name,
        doctor_name: data.doctor_name || 'N/A',
        prescription_number: data.prescription_number,
        issued_date: data.issued_date || new Date().toLocaleDateString('vi-VN'),
        total_cost: data.total_cost || '0'
      }
    };

    await this.notificationService.createNotification(notificationData);

    logger.info('Prescription ready notification created from RabbitMQ', {
      messageId: message.id,
      patientName: data.patient_name,
      prescriptionNumber: data.prescription_number
    });
  }

  /**
   * Handle system alert message
   */
  private async handleSystemAlert(message: SystemAlertMessage): Promise<void> {
    const { data } = message;

    if (data.recipient_user_id) {
      // Send to specific user
      const notificationData: CreateNotificationData = {
        recipient_user_id: data.recipient_user_id,
        recipient_type: 'user',
        title: data.title,
        message: data.message,
        type: 'system',
        priority: data.priority,
        channels: ['web', 'email'],
        template_name: 'system_alert',
        template_variables: {
          alert_type: data.alert_type,
          title: data.title,
          message: data.message,
          priority: data.priority
        }
      };

      await this.notificationService.createNotification(notificationData);
    } else {
      // Broadcast to all users - this would need a separate method
      logger.info('System alert broadcast requested', {
        messageId: message.id,
        title: data.title,
        priority: data.priority
      });
      
      // TODO: Implement broadcast functionality
      // This could involve getting all active users and creating notifications for each
    }

    logger.info('System alert processed from RabbitMQ', {
      messageId: message.id,
      title: data.title,
      alertType: data.alert_type
    });
  }

  /**
   * Handle bulk notification message
   */
  private async handleBulkNotification(message: BulkNotificationMessage): Promise<void> {
    const { data } = message;

    // Process notifications in batches to avoid overwhelming the system
    const batchSize = 50;
    const userIds = data.recipient_user_ids;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (userId) => {
        const notificationData: CreateNotificationData = {
          recipient_user_id: userId,
          recipient_type: 'user',
          title: data.title,
          message: data.message,
          type: data.notification_type,
          priority: data.priority || 'normal',
          channels: data.channels || ['web'],
          template_name: data.template_name,
          template_variables: data.template_variables
        };

        return this.notificationService.createNotification(notificationData);
      });

      await Promise.allSettled(promises);

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Bulk notification processed from RabbitMQ', {
      messageId: message.id,
      totalRecipients: userIds.length,
      title: data.title
    });
  }

  /**
   * Validate message structure
   */
  public validateMessage(message: any): message is RabbitMQMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.id || !message.type || !message.timestamp) {
      return false;
    }

    if (!message.data || typeof message.data !== 'object') {
      return false;
    }

    return true;
  }
}
