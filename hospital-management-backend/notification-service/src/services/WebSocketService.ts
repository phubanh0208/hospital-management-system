import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '@hospital/shared';
import { NotificationType, NotificationPriority } from '@hospital/shared';

export interface WebSocketNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private userSockets: Map<string, string> = new Map(); // socketId -> userId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.WEBSOCKET_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string, token?: string }) => {
        this.authenticateUser(socket, data.userId, data.token);
      });

      // Handle user joining rooms
      socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        logger.info('User joined room', { 
          socketId: socket.id, 
          roomId,
          userId: this.userSockets.get(socket.id)
        });
      });

      // Handle user leaving rooms
      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        logger.info('User left room', { 
          socketId: socket.id, 
          roomId,
          userId: this.userSockets.get(socket.id)
        });
      });

      // Handle notification read status
      socket.on('mark-notification-read', (notificationId: string) => {
        const userId = this.userSockets.get(socket.id);
        if (userId) {
          this.broadcastToUser(userId, 'notification-read', { notificationId });
          logger.info('Notification marked as read', { notificationId, userId });
        }
      });

      // Handle typing indicators for chat features
      socket.on('typing-start', (data: { roomId: string }) => {
        const userId = this.userSockets.get(socket.id);
        if (userId) {
          socket.to(data.roomId).emit('user-typing', { userId, isTyping: true });
        }
      });

      socket.on('typing-stop', (data: { roomId: string }) => {
        const userId = this.userSockets.get(socket.id);
        if (userId) {
          socket.to(data.roomId).emit('user-typing', { userId, isTyping: false });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  private authenticateUser(socket: Socket, userId: string, token?: string): void {
    try {
      // TODO: Verify JWT token with auth service
      // For now, we'll accept any userId for development
      
      // Remove user from previous socket if exists
      const existingSocketId = Array.from(this.userSockets.entries())
        .find(([_, uid]) => uid === userId)?.[0];
      
      if (existingSocketId) {
        this.removeUserSocket(existingSocketId);
      }

      // Add user to connected users
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);
      this.userSockets.set(socket.id, userId);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      // Send authentication success
      socket.emit('authenticated', { 
        success: true, 
        userId,
        message: 'Successfully authenticated'
      });

      logger.info('User authenticated', { 
        socketId: socket.id, 
        userId,
        totalConnections: this.connectedUsers.get(userId)?.size || 0
      });

    } catch (error) {
      logger.error('Authentication failed', { socketId: socket.id, userId, error });
      socket.emit('authenticated', { 
        success: false, 
        message: 'Authentication failed'
      });
    }
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      this.removeUserSocket(socket.id);
      logger.info('User disconnected', { 
        socketId: socket.id, 
        userId, 
        reason,
        remainingConnections: this.connectedUsers.get(userId)?.size || 0
      });
    } else {
      logger.info('Anonymous client disconnected', { socketId: socket.id, reason });
    }
  }

  private removeUserSocket(socketId: string): void {
    const userId = this.userSockets.get(socketId);
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      this.userSockets.delete(socketId);
    }
  }

  public async sendNotificationToUser(
    userId: string, 
    notification: WebSocketNotification
  ): Promise<boolean> {
    try {
      const userSockets = this.connectedUsers.get(userId);
      
      if (!userSockets || userSockets.size === 0) {
        logger.info('User not connected, notification will be stored for later', { userId });
        return false;
      }

      // Send to user's personal room
      this.io.to(`user:${userId}`).emit('notification', notification);

      logger.info('Notification sent via WebSocket', {
        userId,
        notificationId: notification.id,
        type: notification.type,
        connectedSockets: userSockets.size
      });

      return true;
    } catch (error) {
      logger.error('Failed to send WebSocket notification', { userId, error });
      return false;
    }
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  public getTotalConnections(): number {
    return this.userSockets.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  public async sendSystemAlert(message: string, priority: NotificationPriority = NotificationPriority.HIGH): Promise<void> {
    const notification: WebSocketNotification = {
      id: `system-${Date.now()}`,
      userId: 'system',
      title: 'System Alert',
      message,
      type: NotificationType.SYSTEM_ALERT,
      priority,
      timestamp: new Date()
    };

    this.broadcastToAll('system-alert', notification);
    logger.info('System alert broadcasted', { message, priority });
  }
}
