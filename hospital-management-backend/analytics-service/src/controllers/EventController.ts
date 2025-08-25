import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';

export class EventController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  async trackEvent(req: Request, res: Response) {
    try {
      const event = req.body;
      if (!event.type || !event.payload) {
        return res.status(400).json({ success: false, message: 'Invalid event structure' });
      }

      await this.analyticsService.processEvent(event);

      res.status(202).json({ success: true, message: 'Event accepted' });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ success: false, message: 'Failed to track event' });
    }
  }
}

