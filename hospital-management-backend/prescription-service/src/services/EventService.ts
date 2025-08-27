import axios from 'axios';
import { logger, publishToRabbitMQ } from '@hospital/shared';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
      
      // Also publish to RabbitMQ for prescription notifications with retry logic
      if (type === 'prescription.ready') {
        await this.publishWithRetry('PRESCRIPTION_READY', payload.data || payload, MAX_RETRIES);
        logger.info(`Event '${type}' published to RabbitMQ with routing key 'PRESCRIPTION_READY'`);
      }
      
      logger.info(`Event '${type}' sent to analytics service.`);
    } catch (error) {
      // This outer catch is for synchronous errors during the axios call setup
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initiate analytics event call for '${type}':`, errorMessage);
    }
  }

  /**
   * Publish message to RabbitMQ with retry logic
   */
  private static async publishWithRetry(routingKey: string, payload: any, retriesLeft: number): Promise<void> {
    try {
      await publishToRabbitMQ(routingKey, payload);
    } catch (error) {
      logger.error(`Failed to publish to RabbitMQ (${retriesLeft} retries left):`, error);
      
      if (retriesLeft > 0) {
        // Wait before retrying with exponential backoff
        const delay = RETRY_DELAY_MS * (MAX_RETRIES - retriesLeft + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logger.info(`Retrying RabbitMQ publish in ${delay}ms...`);
        return this.publishWithRetry(routingKey, payload, retriesLeft - 1);
      } else {
        // All retries exhausted, log error but don't throw
        logger.error(`Failed to publish prescription ready event to RabbitMQ after ${MAX_RETRIES} retries:`, error);
        // Could implement dead letter queue or manual retry job here
      }
    }
  }
}

