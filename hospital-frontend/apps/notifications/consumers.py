import json
import asyncio
import websockets
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async
import logging
import requests

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.api_gateway_ws = None
        self.user_id = None
        self.user_room = None
        self.authenticated = False

    async def connect(self):
        # Get user from session/scope
        user = self.scope.get('user')
        if not user or not hasattr(user, 'id'):
            logger.warning('WebSocket connection rejected: No authenticated user')
            await self.close()
            return
            
        self.user_id = str(user.id)
        self.user_room = f'notifications_{self.user_id}'
        
        # Join user-specific group
        await self.channel_layer.group_add(self.user_room, self.channel_name)
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Connect to API Gateway WebSocket proxy
        await self.connect_to_api_gateway_websocket()
        
        logger.info(f'WebSocket connected for user {self.user_id}')

    async def disconnect(self, close_code):
        # Disconnect from API Gateway WebSocket
        if self.api_gateway_ws:
            await self.api_gateway_ws.close()
            
        # Leave user group
        if self.user_room:
            await self.channel_layer.group_discard(self.user_room, self.channel_name)
            
        logger.info(f'WebSocket disconnected for user {self.user_id} with code {close_code}')

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'authenticate':
                # Send authentication through API Gateway
                if self.api_gateway_ws:
                    await self.api_gateway_ws.send(json.dumps({
                        'authenticate': {
                            'userId': self.user_id,
                            'token': data.get('token')
                        }
                    }))
                    self.authenticated = True
                    
            elif message_type == 'mark_read':
                # Mark notification as read via API Gateway HTTP endpoint
                notification_id = data.get('notificationId')
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    
            elif message_type == 'fetch_notifications':
                # Fetch user notifications via API Gateway
                await self.fetch_user_notifications()
                    
        except json.JSONDecodeError:
            logger.error('Invalid JSON received from WebSocket client')
        except Exception as e:
            logger.error(f'Error processing WebSocket message: {e}')

    async def connect_to_api_gateway_websocket(self):
        """Connect to the API Gateway WebSocket proxy for notifications"""
        try:
            # Use API Gateway WebSocket proxy instead of direct connection
            api_gateway_ws_url = getattr(settings, 'API_GATEWAY_WS_URL', 'ws://localhost:3000/ws/notifications')
            self.api_gateway_ws = await websockets.connect(api_gateway_ws_url)
            
            # Start listening for messages from API Gateway
            asyncio.create_task(self.listen_to_api_gateway())
            
            logger.info(f'Connected to API Gateway WebSocket for user {self.user_id}')
            
        except Exception as e:
            logger.error(f'Failed to connect to API Gateway WebSocket: {e}')
            # Fallback: work without WebSocket connection
            await self.send(text_data=json.dumps({
                'type': 'connection_error',
                'message': 'Failed to connect to notification system'
            }))

    async def listen_to_api_gateway(self):
        """Listen for messages from API Gateway and forward to client"""
        try:
            async for message in self.api_gateway_ws:
                data = json.loads(message)
                
                # Forward notification to client
                await self.send(text_data=json.dumps({
                    'type': 'notification',
                    'data': data
                }))
                
        except websockets.exceptions.ConnectionClosed:
            logger.info('API Gateway WebSocket connection closed')
        except Exception as e:
            logger.error(f'Error listening to API Gateway: {e}')

    async def mark_notification_read(self, notification_id):
        """Mark notification as read via API Gateway HTTP endpoint"""
        try:
            # Get user token from scope or session
            token = self.scope.get('session', {}).get('access_token')
            if not token:
                return
                
            api_gateway_url = getattr(settings, 'API_GATEWAY_URL', 'http://localhost:3000')
            
            # Make HTTP request to API Gateway
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.put(
                    f'{api_gateway_url}/api/notifications/{notification_id}/read',
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    json={'userId': self.user_id},
                    timeout=10
                )
            )
            
            if response.status_code == 200:
                await self.send(text_data=json.dumps({
                    'type': 'notification_read',
                    'notificationId': notification_id,
                    'success': True
                }))
            else:
                logger.error(f'Failed to mark notification as read: {response.status_code}')
                
        except Exception as e:
            logger.error(f'Error marking notification as read: {e}')

    async def fetch_user_notifications(self):
        """Fetch user notifications via API Gateway"""
        try:
            token = self.scope.get('session', {}).get('access_token')
            if not token:
                return
                
            api_gateway_url = getattr(settings, 'API_GATEWAY_URL', 'http://localhost:3000')
            
            # Fetch notifications via API Gateway
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.get(
                    f'{api_gateway_url}/api/notifications',
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    params={
                        'userId': self.user_id,
                        'limit': 50,
                        'page': 1
                    },
                    timeout=10
                )
            )
            
            if response.status_code == 200:
                data = response.json()
                await self.send(text_data=json.dumps({
                    'type': 'notifications_list',
                    'data': data.get('data', {}).get('notifications', []),
                    'pagination': data.get('data', {}).get('pagination', {})
                }))
            else:
                logger.error(f'Failed to fetch notifications: {response.status_code}')
                
        except Exception as e:
            logger.error(f'Error fetching notifications: {e}')

    # Channel layer message handlers
    async def notification_message(self, event):
        """Handle notification messages from channel layer"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))

    async def system_message(self, event):
        """Handle system messages from channel layer"""
        await self.send(text_data=json.dumps({
            'type': 'system',
            'data': event['data']
        }))
