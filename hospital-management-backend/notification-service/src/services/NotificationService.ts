import Notification, { INotification } from '../models/Notification';
import NotificationPreferences, { INotificationPreferences } from '../models/NotificationPreferences';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import { TemplateService } from './TemplateService';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';
import { logger } from '@hospital/shared';
import mongoose from 'mongoose';
import { rabbitmqConnection } from '../config/rabbitmq';
import { MessageRoutingKeys } from '../types/MessageTypes';

export interface CreateNotificationData {
  recipient_user_id: string;
  recipient_type: 'user' | 'patient' | 'doctor' | 'staff';
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'system' | 'emergency' | 'reminder';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: ('web' | 'email' | 'sms' | 'push')[];
  related_entity_type?: 'appointment' | 'prescription' | 'patient' | 'user';
  related_entity_id?: string;
  expires_at?: Date;
  template_name?: string;
  template_variables?: Record<string, any>;
}

export class NotificationService {
  private templateService: TemplateService;
  private emailService: EmailService;
  private smsService: SMSService;

  constructor() {
    this.templateService = new TemplateService();
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  public async createNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      // Get user preferences to determine channels
      const userPreferences = await this.getUserPreferences(data.recipient_user_id);
      const channels = data.channels || this.getDefaultChannels(data.type, userPreferences);

      const notification = new Notification({
        recipient_user_id: data.recipient_user_id,
        recipient_type: data.recipient_type,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'normal',
        channels,
        status: 'pending',
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        expires_at: data.expires_at,
        created_at: new Date()
      });

      await notification.save();

      logger.info('Notification created', {
        notificationId: notification.id,
        recipientUserId: data.recipient_user_id,
        type: data.type,
        channels
      });

      // Send notification immediately
      await this.sendNotification(notification.id, data.template_name, data.template_variables);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  public async sendNotification(
    notificationId: string, 
    templateName?: string, 
    templateVariables?: Record<string, any>
  ): Promise<void> {
    try {
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (notification.status !== 'pending') {
        logger.warn('Notification already processed', { notificationId, status: notification.status });
        return;
      }

      // Send via each channel
      const sendPromises = notification.channels.map(channel => 
        this.sendViaChannel(notification, channel, templateName, templateVariables)
      );

      await Promise.allSettled(sendPromises);

      // Update notification status
      notification.status = 'sent';
      notification.sent_at = new Date();
      await notification.save();

      logger.info('Notification sent via all channels', {
        notificationId,
        channels: notification.channels
      });

    } catch (error) {
      logger.error('Error sending notification:', error);
      
      // Update notification status to failed
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'failed'
      });
      
      throw error;
    }
  }

  private async sendViaChannel(
    notification: INotification,
    channel: string,
    templateName?: string,
    templateVariables?: Record<string, any>
  ): Promise<void> {
    const deliveryLog = new NotificationDeliveryLog({
      notification_id: notification._id,
      channel,
      status: 'pending',
      created_at: new Date()
    });

    try {
      let success = false;
      let provider = '';
      let providerResponse: any = {};

      switch (channel) {
        case 'email':
          success = await this.sendEmailNotification(notification, templateName, templateVariables);
          provider = 'nodemailer';
          break;
        
        case 'sms':
          success = await this.sendSMSNotification(notification, templateName, templateVariables);
          provider = 'twilio';
          break;
        
        case 'web':
          // WebSocket will be handled separately
          success = true;
          provider = 'websocket';
          break;
        
        case 'push':
          // Push notifications - to be implemented
          success = false;
          provider = 'push-service';
          break;
        
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      deliveryLog.status = success ? 'sent' : 'failed';
      deliveryLog.provider = provider;
      deliveryLog.provider_response = providerResponse;
      deliveryLog.sent_at = success ? new Date() : undefined;

    } catch (error) {
      deliveryLog.status = 'failed';
      deliveryLog.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`Failed to send notification via ${channel}:`, error);
    }

    await deliveryLog.save();
  }

  private async sendEmailNotification(
    notification: INotification,
    templateName?: string,
    templateVariables?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user email - this would typically come from user service
      const userEmail = await this.getUserEmail(notification.recipient_user_id);
      
      if (!userEmail) {
        logger.warn('User email not found', { userId: notification.recipient_user_id });
        return false;
      }

      let subject = notification.title;
      let body = notification.message;

      // Use template if provided
      if (templateName && templateVariables) {
        const rendered = await this.templateService.renderTemplate(templateName, 'email', templateVariables);
        if (rendered) {
          subject = rendered.subject;
          body = rendered.body;
        }
      }

      return await this.emailService.sendEmail({
        to: userEmail,
        subject,
        html: body
      });

    } catch (error) {
      logger.error('Error sending email notification:', error);
      return false;
    }
  }

  private async sendSMSNotification(
    notification: INotification,
    templateName?: string,
    templateVariables?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user phone - this would typically come from user service
      const userPhone = await this.getUserPhone(notification.recipient_user_id);
      
      if (!userPhone) {
        logger.warn('User phone not found', { userId: notification.recipient_user_id });
        return false;
      }

      let message = notification.message;

      // Use template if provided
      if (templateName && templateVariables) {
        const rendered = await this.templateService.renderTemplate(templateName, 'sms', templateVariables);
        if (rendered) {
          message = rendered.body;
        }
      }

      return await this.smsService.sendSMS(userPhone, message);

    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      return false;
    }
  }

  public async getNotifications(
    userId: string,
    filters?: {
      status?: string;
      type?: string;
      priority?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    notifications: INotification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { recipient_user_id: userId };
      
      if (filters?.status) query.status = filters.status;
      if (filters?.type) query.type = filters.type;
      if (filters?.priority) query.priority = filters.priority;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(query)
      ]);

      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient_user_id: userId },
        { 
          status: 'read',
          read_at: new Date()
        },
        { new: true }
      );

      if (!result) {
        logger.warn('Notification not found or unauthorized', { notificationId, userId });
        return false;
      }

      logger.info('Notification marked as read', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient_user_id: userId
      });

      if (!result) {
        logger.warn('Notification not found or unauthorized', { notificationId, userId });
        return false;
      }

      logger.info('Notification deleted', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  private async getUserPreferences(userId: string): Promise<INotificationPreferences | null> {
    try {
      return await NotificationPreferences.findOne({ user_id: userId });
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      return null;
    }
  }

  private getDefaultChannels(
    type: string, 
    preferences: INotificationPreferences | null
  ): ('web' | 'email' | 'sms' | 'push')[] {
    const defaultChannels: ('web' | 'email' | 'sms' | 'push')[] = ['web'];

    if (!preferences) {
      return defaultChannels;
    }

    const typePrefs = preferences.preferences[type as keyof typeof preferences.preferences];
    if (typePrefs) {
      if (typePrefs.email) defaultChannels.push('email');
      if (typePrefs.sms) defaultChannels.push('sms');
      if (typePrefs.push) defaultChannels.push('push');
    }

    return defaultChannels;
  }

  // These methods would typically call other services
  private async getUserEmail(userId: string): Promise<string | null> {
    // TODO: Call user service to get email
    // For now, return a placeholder
    return `user-${userId}@hospital.com`;
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    // TODO: Call user service to get phone
    // For now, return a placeholder
    return '+84901234567';
  }

  public async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({
        recipient_user_id: userId,
        status: { $ne: 'read' }
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  public async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await Notification.deleteMany({
        expires_at: { $lt: new Date() }
      });

      logger.info('Cleaned up expired notifications', { deletedCount: result.deletedCount });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  // ========== ASYNC PROCESSING METHODS ==========

  /**
   * Create notification and queue for async processing
   * Returns immediately after saving to DB, actual sending happens via RabbitMQ
   */
  public async createNotificationAsync(data: CreateNotificationData): Promise<INotification> {
    try {
      // Get user preferences to determine channels
      const userPreferences = await this.getUserPreferences(data.recipient_user_id);
      const channels = data.channels || this.getDefaultChannels(data.type, userPreferences);

      const notification = new Notification({
        recipient_user_id: data.recipient_user_id,
        recipient_type: data.recipient_type,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'normal',
        channels,
        status: 'pending',
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        expires_at: data.expires_at,
        created_at: new Date()
      });

      await notification.save();

      logger.info('Notification created (async)', {
        notificationId: notification.id,
        recipientUserId: data.recipient_user_id,
        type: data.type,
        channels
      });

      // Queue for async processing
      await this.queueNotificationForSending(
        notification.id, 
        data.template_name, 
        data.template_variables
      );

      return notification;
    } catch (error) {
      logger.error('Error creating async notification:', error);
      throw error;
    }
  }

  /**
   * Queue notification for async sending via RabbitMQ
   */
  public async queueNotificationForSending(
    notificationId: string,
    templateName?: string,
    templateVariables?: Record<string, any>
  ): Promise<void> {
    try {
      const message = {
        id: `send-${notificationId}-${Date.now()}`,
        type: 'send_notification',
        timestamp: new Date(),
        source_service: 'notification-service',
        data: {
          notification_id: notificationId,
          template_name: templateName,
          template_variables: templateVariables
        }
      };

      await rabbitmqConnection.publishMessage(MessageRoutingKeys.SEND_NOTIFICATION, message);

      logger.info('Notification queued for async sending', {
        notificationId,
        messageId: message.id
      });
    } catch (error) {
      logger.error('Error queuing notification for sending:', error);
      throw error;
    }
  }

  /**
   * Queue appointment reminder via RabbitMQ
   */
  public async queueAppointmentReminder(data: {
    recipient_user_id: string;
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
    appointment_time: string;
    appointment_number?: string;
    room_number?: string;
    reason?: string;
  }): Promise<void> {
    try {
      const message = {
        id: `appointment-${data.recipient_user_id}-${Date.now()}`,
        type: 'appointment_reminder',
        timestamp: new Date(),
        source_service: 'notification-service',
        data
      };

      await rabbitmqConnection.publishMessage(MessageRoutingKeys.APPOINTMENT_REMINDER, message);

      logger.info('Appointment reminder queued', {
        recipientUserId: data.recipient_user_id,
        appointmentDate: data.appointment_date,
        messageId: message.id
      });
    } catch (error) {
      logger.error('Error queuing appointment reminder:', error);
      throw error;
    }
  }

  /**
   * Queue prescription ready notification via RabbitMQ
   */
  public async queuePrescriptionReady(data: {
    recipient_user_id: string;
    patient_name: string;
    doctor_name?: string;
    prescription_number: string;
    issued_date?: string;
    total_cost?: string;
  }): Promise<void> {
    try {
      const message = {
        id: `prescription-${data.recipient_user_id}-${Date.now()}`,
        type: 'prescription_ready',
        timestamp: new Date(),
        source_service: 'notification-service',
        data
      };

      await rabbitmqConnection.publishMessage(MessageRoutingKeys.PRESCRIPTION_READY, message);

      logger.info('Prescription ready notification queued', {
        recipientUserId: data.recipient_user_id,
        prescriptionNumber: data.prescription_number,
        messageId: message.id
      });
    } catch (error) {
      logger.error('Error queuing prescription ready notification:', error);
      throw error;
    }
  }

  /**
   * Queue system alert via RabbitMQ
   */
  public async queueSystemAlert(data: {
    recipient_user_id?: string;
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    alert_type: 'maintenance' | 'emergency' | 'update' | 'security';
  }): Promise<void> {
    try {
      const message = {
        id: `system-alert-${Date.now()}`,
        type: 'system_alert',
        timestamp: new Date(),
        source_service: 'notification-service',
        data
      };

      await rabbitmqConnection.publishMessage(MessageRoutingKeys.SYSTEM_ALERT, message);

      logger.info('System alert queued', {
        title: data.title,
        priority: data.priority,
        messageId: message.id
      });
    } catch (error) {
      logger.error('Error queuing system alert:', error);
      throw error;
    }
  }

  /**
   * Queue bulk notification via RabbitMQ
   */
  public async queueBulkNotification(data: {
    recipient_user_ids: string[];
    title: string;
    message: string;
    notification_type: 'appointment' | 'prescription' | 'system' | 'emergency' | 'reminder';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: ('web' | 'email' | 'sms' | 'push')[];
    template_name?: string;
    template_variables?: Record<string, any>;
  }): Promise<void> {
    try {
      const message = {
        id: `bulk-${Date.now()}`,
        type: 'bulk_notification',
        timestamp: new Date(),
        source_service: 'notification-service',
        data
      };

      await rabbitmqConnection.publishMessage(MessageRoutingKeys.BULK_NOTIFICATION, message);

      logger.info('Bulk notification queued', {
        recipientCount: data.recipient_user_ids.length,
        title: data.title,
        messageId: message.id
      });
    } catch (error) {
      logger.error('Error queuing bulk notification:', error);
      throw error;
    }
  }
}
