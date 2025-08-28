import amqp from 'amqplib';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

interface RabbitMQConfig {
  url: string;
  exchange: string;
  deadLetterExchange: string;
  queues: {
    [key: string]: {
      name: string;
      routingKey: string;
      options?: amqp.Options.AssertQueue;
    };
  };
}

interface MessageOptions {
  persistent?: boolean;
  expiration?: string;
  headers?: { [key: string]: any };
}

class RabbitMQService {
  private connection: any = null;
  private channel: any = null;
  private config: RabbitMQConfig;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  constructor() {
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE || 'hospital_notifications',
      deadLetterExchange: process.env.RABBITMQ_DLX || 'hospital_notifications_dlx',
      queues: {
        APPOINTMENT_REMINDER: {
          name: 'appointment_reminders',
          routingKey: 'APPOINTMENT_REMINDER'
        },
        PRESCRIPTION_READY: {
          name: 'prescription_ready',
          routingKey: 'PRESCRIPTION_READY'
        },
        SYSTEM_ALERTS: {
          name: 'system_alerts',
          routingKey: 'SYSTEM_ALERT'
        },
        NOTIFICATION_DELIVERY_RETRY: {
          name: 'notification_delivery_retry',
          routingKey: 'NOTIFICATION_DELIVERY_RETRY'
        }
      }
    };
  }

  /**
   * Initialize RabbitMQ connection and setup exchanges/queues
   */
  public async initialize(): Promise<void> {
    try {
      await this.connect();
      await this.setupExchangesAndQueues();
      logger.info('RabbitMQ service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ service:', error);
      throw error;
    }
  }

  /**
   * Connect to RabbitMQ with retry logic
   */
  private async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ...', { url: this.config.url });

      this.connection = await amqp.connect(this.config.url, {
        heartbeat: 30,
        connectionTimeout: 10000
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(10); // Limit unacknowledged messages

      // Setup connection event handlers
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));
      this.channel.on('error', this.handleChannelError.bind(this));

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      logger.info('Connected to RabbitMQ successfully');

    } catch (error) {
      this.isConnecting = false;
      this.reconnectAttempts++;

      logger.error(`RabbitMQ connection failed (attempt ${this.reconnectAttempts}):`, error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        logger.info(`Retrying connection in ${this.reconnectDelay}ms...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        logger.error('Max reconnection attempts reached. RabbitMQ service unavailable.');
        throw new Error('Failed to connect to RabbitMQ after maximum retry attempts');
      }
    }
  }

  /**
   * Setup exchanges and queues with dead letter queue configuration
   */
  private async setupExchangesAndQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    try {
      // Create main exchange
      await this.channel.assertExchange(this.config.exchange, 'topic', {
        durable: true,
        autoDelete: false
      });

      // Create dead letter exchange
      await this.channel.assertExchange(this.config.deadLetterExchange, 'topic', {
        durable: true,
        autoDelete: false
      });

      // Create queues with dead letter queue configuration
      for (const [key, queueConfig] of Object.entries(this.config.queues)) {
        const queueName = queueConfig.name;
        const dlqName = `${queueName}.dlq`;
        const retryQueueName = `${queueName}.retry`;

        // Create dead letter queue
        await this.channel.assertQueue(dlqName, {
          durable: true,
          autoDelete: false
        });

        // Bind dead letter queue to DLX
        await this.channel.bindQueue(dlqName, this.config.deadLetterExchange, queueConfig.routingKey);

        // Create retry queue with TTL that republishes to main exchange
        await this.channel.assertQueue(retryQueueName, {
          durable: true,
          autoDelete: false,
          arguments: {
            'x-message-ttl': 60000, // 1 minute TTL for retry
            'x-dead-letter-exchange': this.config.exchange,
            'x-dead-letter-routing-key': queueConfig.routingKey
          }
        });

        // Create main queue with dead letter queue configuration
        await this.channel.assertQueue(queueName, {
          durable: true,
          autoDelete: false,
          arguments: {
            'x-dead-letter-exchange': this.config.deadLetterExchange,
            'x-dead-letter-routing-key': queueConfig.routingKey,
            ...queueConfig.options?.arguments
          }
        });

        // Bind main queue to main exchange
        await this.channel.bindQueue(queueName, this.config.exchange, queueConfig.routingKey);

        logger.info(`Queue setup completed: ${queueName}`);
      }

      logger.info('All exchanges and queues configured successfully');
    } catch (error) {
      logger.error('Error setting up exchanges and queues:', error);
      throw error;
    }
  }

  /**
   * Publish message to RabbitMQ with retry logic
   */
  public async publishMessage(routingKey: string, message: any, options: MessageOptions = {}): Promise<boolean> {
    if (!this.channel) {
      logger.warn('RabbitMQ channel not available, attempting to reconnect...');
      await this.connect();

      if (!this.channel) {
        throw new Error('Failed to establish RabbitMQ connection');
      }
    }

    try {
      // Spread the original message and add/overwrite metadata
      const fullMessage = {
        ...message,
        id: message.id || this.generateMessageId(),
        timestamp: new Date().toISOString(),
        source: process.env.SERVICE_NAME || 'unknown-service', // Add source service
        headers: {
          'x-retry-count': 0,
          'x-original-routing-key': routingKey,
          ...(message.headers || {}),
          ...(options.headers || {})
        }
      };

      const messageBuffer = Buffer.from(JSON.stringify(fullMessage));

      const publishOptions: amqp.Options.Publish = {
        persistent: options.persistent ?? true,
        timestamp: Date.now(),
        messageId: this.generateMessageId(),
        ...options
      };

      const success = this.channel.publish(
        this.config.exchange,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (success) {
        logger.info('Message published successfully', {
          routingKey,
          messageId: publishOptions.messageId
        });
        return true;
      } else {
        logger.warn('Message could not be published (channel buffer full)', { routingKey });
        return false;
      }

    } catch (error) {
      logger.error('Error publishing message to RabbitMQ:', error);
      throw error;
    }
  }


  public async publishDelayedMessage(routingKey: string, message: any, delay: number, options: MessageOptions = {}): Promise<boolean> {
    if (!this.channel) {
      logger.warn('RabbitMQ channel not available, attempting to reconnect...');
      await this.connect();

      if (!this.channel) {
        throw new Error('Failed to establish RabbitMQ connection');
      }
    }

    try {
      const delayedExchange = process.env.DELAYED_EXCHANGE || 'hospital_notifications_delayed';

      const fullMessage = {
        ...message,
        id: message.id || this.generateMessageId(),
        timestamp: new Date().toISOString(),
        source: process.env.SERVICE_NAME || 'unknown-service',
        headers: {
          'x-delay': delay,
          'x-retry-count': 0,
          'x-original-routing-key': routingKey,
          ...(message.headers || {}),
          ...(options.headers || {})
        }
      };

      const messageBuffer = Buffer.from(JSON.stringify(fullMessage));

      const publishOptions: amqp.Options.Publish = {
        persistent: options.persistent ?? true,
        timestamp: Date.now(),
        messageId: this.generateMessageId(),
        headers: { 'x-delay': delay },
        ...options
      };

      const success = this.channel.publish(
        delayedExchange,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (success) {
        logger.info('Delayed message published successfully', {
          routingKey,
          delay,
          messageId: publishOptions.messageId
        });
        return true;
      } else {
        logger.warn('Delayed message could not be published (channel buffer full)', { routingKey });
        return false;
      }

    } catch (error) {
      logger.error('Error publishing delayed message to RabbitMQ:', error);
      throw error;
    }
  }
  /**
   * Consume messages from a queue with proper error handling
   */
  public async consumeMessages(
    queueName: string,
    handler: (message: any) => Promise<void>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      autoAck?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 60000; // 1 minute
    const autoAck = options.autoAck ?? false;

    try {
      await this.channel.consume(queueName, async (msg: any) => {
        if (!msg) return;

        try {
          const messageContent = JSON.parse(msg.content.toString());
          const retryCount = messageContent.headers?.['x-retry-count'] ?? 0;

          logger.info('Processing message', {
            queueName,
            messageId: messageContent.id,
            retryCount
          });

          // Execute message handler
          await handler(messageContent);

          // Acknowledge successful processing
          if (!autoAck) {
            this.channel!.ack(msg);
          }

          logger.info('Message processed successfully', {
            queueName,
            messageId: messageContent.id
          });

        } catch (error) {
          logger.error('Error processing message:', error);

          if (!autoAck) {
            await this.handleMessageError(msg, error as Error, maxRetries, retryDelay);
          }
        }
      }, {
        noAck: autoAck,
        consumerTag: `${queueName}_consumer_${Date.now()}`
      });

      logger.info(`Started consuming messages from queue: ${queueName}`);
    } catch (error) {
      logger.error(`Error setting up consumer for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Handle message processing errors with retry logic
   */
  private async handleMessageError(
    msg: amqp.ConsumeMessage,
    error: Error,
    maxRetries: number,
    retryDelay: number
  ): Promise<void> {
    if (!this.channel) return;

    try {
      const messageContent = JSON.parse(msg.content.toString());
      const retryCount = messageContent.headers?.['x-retry-count'] ?? 0;
      const originalRoutingKey = messageContent.headers?.['x-original-routing-key'] ?? 'unknown';

      if (retryCount < maxRetries) {
        // Send to retry queue
        logger.info(`Scheduling retry ${retryCount + 1}/${maxRetries} for message`, {
          messageId: messageContent.id,
          originalRoutingKey,
          retryDelay
        });

        messageContent.headers['x-retry-count'] = retryCount + 1;
        messageContent.headers['x-retry-reason'] = error.message;
        messageContent.headers['x-retry-timestamp'] = new Date().toISOString();

        const retryQueueName = `${msg.fields.routingKey}.retry`;

        await this.channel.sendToQueue(
          retryQueueName,
          Buffer.from(JSON.stringify(messageContent)),
          {
            persistent: true,
            headers: messageContent.headers
          }
        );

        // Acknowledge original message
        this.channel.ack(msg);

      } else {
        // Max retries reached, reject and send to DLQ
        logger.error(`Max retries reached for message, sending to DLQ`, {
          messageId: messageContent.id,
          originalRoutingKey,
          finalError: error.message
        });

        // Add final failure information
        messageContent.headers['x-final-failure'] = true;
        messageContent.headers['x-final-failure-reason'] = error.message;
        messageContent.headers['x-final-failure-timestamp'] = new Date().toISOString();

        // Reject message (will be sent to DLQ due to dead letter exchange configuration)
        this.channel.reject(msg, false);
      }
    } catch (retryError) {
      logger.error('Error handling message retry logic:', retryError);
      // If retry handling fails, reject the message
      this.channel.reject(msg, false);
    }
  }

  /**
   * Connection error handler
   */
  private handleConnectionError(error: Error): void {
    logger.error('RabbitMQ connection error:', error);
    this.connection = null;
    this.channel = null;
  }

  /**
   * Connection close handler
   */
  private handleConnectionClose(): void {
    logger.warn('RabbitMQ connection closed, attempting to reconnect...');
    this.connection = null;
    this.channel = null;

    // Attempt to reconnect after delay
    setTimeout(() => {
      if (!this.isConnecting) {
        this.connect().catch(error => {
          logger.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay);
  }

  /**
   * Channel error handler
   */
  private handleChannelError(error: Error): void {
    logger.error('RabbitMQ channel error:', error);
    this.channel = null;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return uuidv4();
  }

  /**
   * Close connection gracefully
   */
  public async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): { connected: boolean; channel: boolean } {
    return {
      connected: this.connection !== null,
      channel: this.channel !== null
    };
  }
}

// Singleton instance
const rabbitMQService = new RabbitMQService();

// Exported utility functions
export const publishToRabbitMQ = async (routingKey: string, message: any, options?: MessageOptions): Promise<void> => {
  try {
    await rabbitMQService.publishMessage(routingKey, message, options);
  } catch (error) {
    logger.error('Failed to publish message to RabbitMQ:', error);
    throw error;
  }
};

export const publishDelayedMessageToRabbitMQ = async (routingKey: string, message: any, delay: number, options?: MessageOptions): Promise<void> => {
  try {
    await rabbitMQService.publishDelayedMessage(routingKey, message, delay, options);
  } catch (error) {
    logger.error('Failed to publish delayed message to RabbitMQ:', error);
    throw error;
  }
};

export const initializeRabbitMQ = async (): Promise<void> => {
  await rabbitMQService.initialize();
};

export const closeRabbitMQ = async (): Promise<void> => {
  await rabbitMQService.close();
};

export const getRabbitMQStatus = (): { connected: boolean; channel: boolean } => {
  return rabbitMQService.getStatus();
};

export const consumeRabbitMQMessages = async (
  queueName: string,
  handler: (message: any) => Promise<void>,
  options?: { maxRetries?: number; retryDelay?: number; autoAck?: boolean }
): Promise<void> => {
  await rabbitMQService.consumeMessages(queueName, handler, options);
};

export { RabbitMQService };
