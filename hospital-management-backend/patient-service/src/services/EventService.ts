import axios from 'axios';
import { logger } from '@hospital/shared';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';

export class EventService {
  static async sendEvent(type: string, payload: any) {
    try {
      const event = { type, payload };
      // Fire-and-forget request
      axios.post(`${ANALYTICS_SERVICE_URL}/api/events/track`, event, {
        timeout: 3000,
      }).catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Analytics event '${type}' failed (non-blocking):`, errorMessage);
      });
      logger.info(`Event '${type}' sent to analytics service.`);
    } catch (error) {
      // This outer catch is for synchronous errors during the axios call setup
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initiate analytics event call for '${type}':`, errorMessage);
    }
  }
}

