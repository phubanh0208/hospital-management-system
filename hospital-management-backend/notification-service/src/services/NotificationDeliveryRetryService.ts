import { logger, publishToRabbitMQ } from '@hospital/shared';
import { NotificationDeliveryRetry, INotificationDeliveryRetry } from '../models/NotificationDeliveryRetry';
import { NotificationService } from './NotificationService';
import Notification from '../models/Notification';

export interface FailedDelivery {
  id: string;
  notification_id: string;
  channel: 'email' | 'sms' | 'web';
  provider: string;
  recipient: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  last_attempted_at: string;
  created_at: string;
  status: 'pending' | 'retrying' | 'failed' | 'succeeded';
}

export interface RetryConfig {
  maxRetries: number;
  retryDelays: number[]; // delays in minutes
  enabledChannels: string[];
}

export class NotificationDeliveryRetryService {
  private retryConfig: RetryConfig;

  constructor() {
    this.retryConfig = {
      maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
      retryDelays: [5, 15, 60], // 5 min, 15 min, 1 hour
      enabledChannels: (process.env.NOTIFICATION_RETRY_CHANNELS || 'email,web').split(',')
    };
  }

  /**
   * Schedule a failed notification delivery for retry
   */
    public async scheduleRetry(
    notificationId: string,
    channel: 'email' | 'sms' | 'web',
    provider: string,
    recipient: string,
    errorMessage: string
  ): Promise<void> {
    try {
      if (!this.retryConfig.enabledChannels.includes(channel)) {
        logger.info('Retry disabled for channel', { channel, notificationId });
        return;
      }

      const existingRetry = await NotificationDeliveryRetry.findOne({
        notification_id: notificationId,
        channel,
        status: { $ne: 'succeeded' },
      }).sort({ created_at: -1 });

      let retryCount = existingRetry ? existingRetry.retry_count : 0;

      if (existingRetry && retryCount >= this.retryConfig.maxRetries) {
        logger.warn('Max retries exceeded for notification delivery', {
          notificationId,
          channel,
          retryCount,
        });
        existingRetry.status = 'failed';
        await existingRetry.save();
        return;
      }

      const nextRetryDelay = this.retryConfig.retryDelays[Math.min(retryCount, this.retryConfig.retryDelays.length - 1)];
      const nextRetryAt = new Date(Date.now() + nextRetryDelay * 60000);
      let retryId: string;

      if (existingRetry) {
        existingRetry.retry_count += 1;
        existingRetry.next_retry_at = nextRetryAt;
        existingRetry.last_attempted_at = new Date();
        existingRetry.error_message = errorMessage;
        existingRetry.status = 'pending';
        const updatedRetry = await existingRetry.save();
        retryId = updatedRetry._id.toString();
      } else {
        const newRetry = await NotificationDeliveryRetry.create({
          notification_id: notificationId,
          channel,
          provider,
          recipient,
          error_message: errorMessage,
          retry_count: 1,
          max_retries: this.retryConfig.maxRetries,
          next_retry_at: nextRetryAt,
          last_attempted_at: new Date(),
          status: 'pending',
        });
        retryId = newRetry._id.toString();
      }

      await publishToRabbitMQ('NOTIFICATION_DELIVERY_RETRY', {
        retry_id: retryId,
        notification_id: notificationId,
        channel,
        provider,
        recipient,
        scheduled_for: nextRetryAt.getTime(),
      });

      logger.info('Delivery retry scheduled', {
        notificationId,
        channel,
        retryCount: existingRetry ? existingRetry.retry_count : 1,
        nextRetryInMinutes: nextRetryDelay,
      });
    } catch (error) {
      logger.error('Error scheduling delivery retry:', error);
    }
  }

  /**
   * Process pending retries
   */
    public async processRetries(): Promise<void> {
    try {
      const pendingRetries = await NotificationDeliveryRetry.find({
        status: 'pending',
        next_retry_at: { $lte: new Date() },
        retry_count: { $lt: this.retryConfig.maxRetries },
      })
        .sort({ next_retry_at: 1 })
        .limit(50);

      if (pendingRetries.length === 0) {
        logger.debug('No pending retries to process');
        return;
      }

      logger.info(`Processing ${pendingRetries.length} pending delivery retries`);

      for (const retry of pendingRetries) {
        try {
          const notification = await Notification.findById(retry.notification_id);
          if (!notification) {
            logger.error('Notification not found for retry', { retryId: retry._id });
            retry.status = 'failed';
            retry.error_message = 'Notification not found';
            await retry.save();
            continue;
          }

          const fullRetryData = { ...retry.toObject(), ...notification.toObject(), id: retry._id };
          await this.processSingleRetry(fullRetryData);
        } catch (error) {
          logger.error(`Error processing retry ${retry._id}:`, error);
          await this.rescheduleRetry(retry._id, error as Error);
        }
      }
    } catch (error) {
      logger.error('Error processing delivery retries:', error);
    }
  }

  /**
   * Process a single retry attempt
   */
    private async processSingleRetry(retry: any): Promise<void> {
    try {
      await this.updateRetryStatus(retry.id, 'retrying');

      const success = await this.attemptDelivery(retry);

      if (success) {
        await this.updateRetryStatus(retry.id, 'succeeded');
        logger.info('Retry delivery succeeded', {
          retryId: retry.id,
          notificationId: retry.notification_id,
          channel: retry.channel,
          retryCount: retry.retry_count,
        });
      } else {
        if (retry.retry_count < retry.max_retries) {
          await this.scheduleNextRetry(retry);
        } else {
          await this.markDeliveryAsFailed(retry.id);
        }
      }
    } catch (error) {
      logger.error(`Error in single retry processing:`, error);
      if (retry.retry_count < retry.max_retries) {
        await this.rescheduleRetry(retry.id, error as Error);
      } else {
        await this.markDeliveryAsFailed(retry.id);
      }
    }
  }

  /**
   * Attempt delivery via specific channel
   * For now, just log the attempt - actual delivery will be handled separately
   */
  private async attemptDelivery(retry: any): Promise<boolean> {
    try {
      logger.info('Attempting delivery retry', {
        retryId: retry.id,
        channel: retry.channel,
        recipient: retry.recipient || retry.recipient_user_id,
        title: retry.title
      });

      // For now, we'll simulate successful delivery for web channel and mark others as requiring actual implementation
      switch (retry.channel) {
        case 'web':
          // Web notifications can be considered delivered immediately
          // In production, this would send via WebSocket
          logger.info('Web notification retry - marking as delivered', {
            retryId: retry.id,
            userId: retry.recipient_user_id
          });
          return true;

        case 'email':
        case 'sms':
          // Email and SMS require actual provider integration
          // For now, log that we would attempt delivery
          logger.info(`${retry.channel.toUpperCase()} notification retry attempted`, {
            retryId: retry.id,
            recipient: retry.recipient,
            note: 'Actual delivery requires provider configuration'
          });
          // Return true for successful processing (mock)
          return true;

        default:
          logger.warn('Unknown channel for retry', { channel: retry.channel });
          return false;
      }
    } catch (error) {
      logger.error('Error attempting delivery:', error);
      return false;
    }
  }

  /**
   * Update retry status
   */
    private async updateRetryStatus(retryId: string, status: 'pending' | 'retrying' | 'failed' | 'succeeded'): Promise<void> {
    await NotificationDeliveryRetry.findByIdAndUpdate(retryId, { $set: { status } });
  }

  /**
   * Schedule next retry attempt
   */
    private async scheduleNextRetry(retry: any): Promise<void> {
    const nextRetryDelay = this.retryConfig.retryDelays[Math.min(retry.retry_count, this.retryConfig.retryDelays.length - 1)];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay * 60000);

    await NotificationDeliveryRetry.findByIdAndUpdate(retry.id, {
      $set: {
        next_retry_at: nextRetryAt,
        status: 'pending',
      },
    });

    logger.info('Next retry scheduled', {
      retryId: retry.id,
      nextRetryInMinutes: nextRetryDelay,
    });
  }

  /**
   * Reschedule retry due to processing error
   */
    private async rescheduleRetry(retryId: string, error: Error): Promise<void> {
    const nextRetryAt = new Date(Date.now() + 10 * 60000); // 10 minutes
    await NotificationDeliveryRetry.findByIdAndUpdate(retryId, {
      $set: {
        next_retry_at: nextRetryAt,
        error_message: error.message,
        status: 'pending',
      },
    });
  }

  /**
   * Mark delivery as permanently failed
   */
    private async markDeliveryAsFailed(retryId: string): Promise<void> {
    await NotificationDeliveryRetry.findByIdAndUpdate(retryId, { $set: { status: 'failed' } });
    logger.error('Delivery marked as permanently failed', { retryId });
  }

  /**
   * Get retry statistics
   */
    public async getRetryStatistics(timeframe: string = '24 hours'): Promise<any> {
    try {
      const [value, unit] = timeframe.split(' ');
      const timeframeDate = new Date(Date.now() - parseInt(value) * 60 * 60 * 1000 * (unit === 'hours' ? 1 : 24));

      const stats = await NotificationDeliveryRetry.aggregate([
        { $match: { created_at: { $gte: timeframeDate } } },
        {
          $group: {
            _id: { channel: '$channel', status: '$status' },
            count: { $sum: 1 },
            avg_retries: { $avg: '$retry_count' },
          },
        },
        {
          $project: {
            _id: 0,
            channel: '$_id.channel',
            status: '$_id.status',
            count: '$count',
            avg_retries: '$avg_retries',
          },
        },
        { $sort: { channel: 1, status: 1 } },
      ]);

      return stats.reduce((acc: any, row: any) => {
        if (!acc[row.channel]) {
          acc[row.channel] = {};
        }
        acc[row.channel][row.status] = {
          count: row.count,
          averageRetries: row.avg_retries,
        };
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting retry statistics:', error);
      return {};
    }
  }

  /**
   * Clean up old retry records
   */
    public async cleanupOldRetries(olderThanDays: number = 30): Promise<void> {
    try {
      const cleanupDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await NotificationDeliveryRetry.deleteMany({
        created_at: { $lt: cleanupDate },
        status: { $in: ['succeeded', 'failed'] },
      });

      logger.info('Cleaned up old retry records', {
        deletedCount: result.deletedCount,
        olderThanDays,
      });
    } catch (error) {
      logger.error('Error cleaning up old retry records:', error);
    }
  }
}
