import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from '@hospital/shared';

// Import configurations and services
import { dbConnection } from './config/database';
import { rabbitmqConnection } from './config/rabbitmq';

// Import routes
import notificationRoutes from './routes/notificationRoutes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'notification-service',
    version: '1.0.0',
    uptime: process.uptime(),
    database: {
      mongodb: dbConnection.isHealthy(),
      connectionState: dbConnection.getConnectionState()
    },
    messageQueue: {
      rabbitmq: rabbitmqConnection.isHealthy()
    }
  };

  const isHealthy = healthStatus.database.mongodb && healthStatus.messageQueue.rabbitmq;
  
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// API routes
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  server.close(async () => {
    try {
      await dbConnection.disconnect();
      await rabbitmqConnection.disconnect();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Setup graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to databases and message queue
    await dbConnection.connect();
    await rabbitmqConnection.connect();

    // Start consuming messages from RabbitMQ
    await rabbitmqConnection.consumeMessages(async (message) => {
      logger.info('Received message from RabbitMQ:', message);
      // TODO: Process the message (create notification, send via channels, etc.)
    });

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Notification Service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        service: 'notification-service'
      });
    });

  } catch (error) {
    logger.error('Failed to start Notification Service:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
