import { Router, Request, Response } from 'express';
import { testConnection } from '../config/database';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbConnected = await testConnection();
    
    const healthStatus = {
      status: 'healthy',
      service: 'analytics-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbConnected,
        type: 'TimescaleDB (PostgreSQL)'
      },
      environment: process.env.NODE_ENV || 'development'
    };

    if (!dbConnected) {
      healthStatus.status = 'unhealthy';
      res.status(503).json(healthStatus);
      return;
    }

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check for load balancers
router.get('/simple', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

export default router;
