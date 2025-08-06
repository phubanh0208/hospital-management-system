import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from '@hospital/shared';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

// Define a singleton instance of WebSocketService
let instance: WebSocketService | null = null;

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });
    this.initialize();
    logger.info('WebSocket service initialized');
  }

  private initialize(): void {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: any) => {
      let userId = 'anonymous';
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        const token = url.searchParams.get('token');

        logger.info(`Attempting to connect WS. Token found: ${!!token}`);

        if (token && token !== 'None' && token.trim() !== '') {
          const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
          const resp = await fetch(`${authServiceUrl}/api/auth/profile`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (resp && resp.ok) {
            const data = await resp.json();
            const userData = data as any;
            userId = userData?.data?.id || userData?.id || 'anonymous';
            logger.info(`WS auth success. User ID: ${userId}`);
          } else {
            const errorBody = await resp.text();
            logger.warn(`WS auth failed: invalid token. Status: ${resp.status}, Body: ${errorBody}`);
          }
        } else {
            logger.warn('WS connection attempt without a valid token.');
        }
      } catch (e) {
        logger.error('WS auth error:', e);
      }

      ws.userId = userId;
      this.addClient(userId, ws);

      logger.info(`WebSocket client connected: ${userId}`);

      ws.on('message', (message: any) => {
        logger.info(`Received message from ${userId}: ${message}`);
        // Handle incoming messages if needed
      });

      ws.on('close', () => {
        this.removeClient(ws.userId, ws);
        logger.info(`WebSocket client disconnected: ${userId}`);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${userId}:`, error);
      });
    });
  }

  private addClient(userId: string, ws: AuthenticatedWebSocket): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)?.add(ws);
  }

  private removeClient(userId: string | undefined, ws: AuthenticatedWebSocket): void {
    if (userId && this.clients.has(userId)) {
      this.clients.get(userId)?.delete(ws);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  public broadcastToUser(userId: string, message: any): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const messageString = JSON.stringify(message);
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });
      logger.info(`Broadcasted message to user ${userId}`);
    }
  }

  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId);
  }
}

export const initializeWebSocket = (server: HttpServer) => {
  if (!instance) {
    instance = new WebSocketService(server);
  }
  return instance;
};

export const getWebSocketService = () => {
  if (!instance) {
    throw new Error('WebSocketService not initialized');
  }
  return instance;
};

