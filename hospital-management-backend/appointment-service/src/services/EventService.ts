import axios from 'axios';
import { logger, publishToRabbitMQ, publishDelayedMessageToRabbitMQ } from '@hospital/shared';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';

export class EventService {
  static async sendEvent(type: string, payload: any) {
    try {
      const event = { type, payload };
      
      // Send to analytics service (fire-and-forget)
      axios.post(`${ANALYTICS_SERVICE_URL}/api/events/track`, event, {
        timeout: 3000,
      }).catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Analytics event '${type}' failed (non-blocking):`, errorMessage);
      });
      
      // Also publish to RabbitMQ for notifications
      if (type === 'appointment.reminder' || type === 'appointment.confirmed') {
        // routingKey must match the pattern 'appointment.*' (e.g., 'appointment.reminder')
        const routingKey = type;
        // message.type must match the case in notification-service's MessageHandler (e.g., 'appointment_reminder')
        const messageType = type.replace('.', '_');

        const messagePayload = {
          type: messageType,
          data: payload.data,
        };

        await publishToRabbitMQ(routingKey, messagePayload);
        logger.info(`Event '${type}' published to RabbitMQ with routing key '${routingKey}'`);
      }
      
      logger.info(`Event '${type}' sent to analytics service.`);
    } catch (error) {
      // This outer catch is for synchronous errors during the axios call setup
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initiate analytics event call for '${type}':`, errorMessage);
    }
  }

  static async sendDelayedEvent(type: string, payload: any, delay: number) {
    try {
      if (type === 'appointment.reminder') {
        const routingKey = type;
        const messageType = type.replace('.', '_');

        const messagePayload = {
          type: messageType,
          data: payload.data || payload,
        };

        await publishDelayedMessageToRabbitMQ(routingKey, messagePayload, delay);
        logger.info(`Delayed event '${type}' published to RabbitMQ with routing key '${routingKey}' and delay ${delay}ms`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to publish delayed event for '${type}':`, errorMessage);
    }
  }
}

