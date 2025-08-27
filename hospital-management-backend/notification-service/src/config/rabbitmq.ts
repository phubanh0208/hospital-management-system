import amqp from 'amqplib';
import { logger } from '@hospital/shared';

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: any = null;
  private channel: any = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('RabbitMQ already connected');
      return;
    }

    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup exchange and queue
      const exchange = process.env.NOTIFICATION_EXCHANGE || 'notification_exchange';
            const queue = process.env.NOTIFICATION_QUEUE || 'notification_queue_v2';
      const dlx = process.env.NOTIFICATION_DLX || 'notification_exchange_dlx';
            const dlq = process.env.NOTIFICATION_DLQ || 'notification_queue_dlq_v2';

      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Assert Dead Letter Exchange and Queue
      await this.channel.assertExchange(dlx, 'fanout', { durable: true });
      await this.channel.assertQueue(dlq, { durable: true });
      await this.channel.bindQueue(dlq, dlx, ''); // Bind DLQ to DLX

      // Assert main queue with DLX configuration
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlx
        }
      });

      // Bind queue to exchange with routing keys
      await this.channel.bindQueue(queue, exchange, 'notification.*');
      await this.channel.bindQueue(queue, exchange, 'appointment.*');
      await this.channel.bindQueue(queue, exchange, 'prescription.*');

      this.isConnected = true;
      logger.info('RabbitMQ connected successfully', {
        service: 'notification-service',
        exchange,
        queue
      });

      // Handle connection events
      this.connection.on('error', (error: any) => {
        logger.error('RabbitMQ connection error:', error);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      logger.info('RabbitMQ disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }

  public getChannel(): any {
    return this.channel;
  }

  public isHealthy(): boolean {
    return this.isConnected && this.connection !== null && this.channel !== null;
  }

  public async publishMessage(routingKey: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const exchange = process.env.NOTIFICATION_EXCHANGE || 'notification_exchange';
    const messageBuffer = Buffer.from(JSON.stringify(message));

    try {
      const published = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now()
      });

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      logger.info('Message published to RabbitMQ', {
        routingKey,
        messageId: message.id || 'unknown'
      });
    } catch (error) {
      logger.error('Error publishing message to RabbitMQ:', error);
      throw error;
    }
  }

  public async consumeMessages(callback: (message: any) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

        const queue = process.env.NOTIFICATION_QUEUE || 'notification_queue_v2';

    try {
      await this.channel.consume(queue, async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
            logger.info('Message processed successfully', {
              messageId: content.id || 'unknown'
            });
          } catch (error) {
            logger.error('Error processing message:', error);
            this.channel.nack(msg, false, false); // Don't requeue failed messages
          }
        }
      });

      logger.info('Started consuming messages from RabbitMQ', { queue });
    } catch (error) {
      logger.error('Error setting up message consumer:', error);
      throw error;
    }
  }
}

export const rabbitmqConnection = RabbitMQConnection.getInstance();
