# Notification Service Documentation

## 1. Overview

The Notification Service is a core component of the Hospital Management System, responsible for handling all user-facing notifications. It is designed to be a robust, scalable, and extensible system that supports multiple communication channels, including real-time WebSockets, email, and SMS.

### Key Features:

- **Multi-Channel Delivery:** Sends notifications via WebSockets, email, and SMS.
- **Real-Time Notifications:** Utilizes WebSockets for instant, real-time updates to connected clients.
- **Asynchronous Processing:** Leverages RabbitMQ to queue and process notifications asynchronously, ensuring high availability and responsiveness.
- **Template-Based Messaging:** Uses a template engine to generate consistent and professional-looking messages.
- **User Preferences:** Allows users to customize their notification settings for different types of events.
- **Delivery Tracking and Retries:** Logs all notification deliveries and includes a built-in retry mechanism for failed attempts.

---

## 2. API Endpoints

All endpoints are accessed through the API Gateway. The base path for the Notification Service is `/api/notifications`.

### 2.1. Get Notifications

Retrieves a paginated list of notifications for the authenticated user.

- **Endpoint:** `GET /api/notifications`
- **Authentication:** Required
- **Query Parameters:**
  - `userId` (string, required): The ID of the user to retrieve notifications for.
  - `page` (number, optional, default: 1): The page number for pagination.
  - `limit` (number, optional, default: 20): The number of notifications per page.
  - `status` (string, optional): Filter by notification status (e.g., `sent`, `read`, `pending`).
  - `type` (string, optional): Filter by notification type (e.g., `appointment`, `prescription`).

- **Example Request:**
  ```bash
  curl -X GET 'http://localhost:3000/api/notifications?userId=a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6&page=1&limit=10'
  ```

### 2.2. Get Notification by ID

Retrieves a single notification by its unique ID.

- **Endpoint:** `GET /api/notifications/:id`
- **Authentication:** Required

- **Example Request:**
  ```bash
  curl -X GET http://localhost:3000/api/notifications/68afa0b06bff95dfd987b7af
  ```

### 2.3. Create Notification

Creates a new notification. This is typically used for administrative purposes.

- **Endpoint:** `POST /api/notifications`
- **Authentication:** Required (Admin/Staff role)
- **Request Body:**
  ```json
  {
    "recipient_user_id": "a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6",
    "recipient_type": "patient",
    "title": "Manual Notification",
    "message": "This is a test notification created by an admin.",
    "type": "system",
    "priority": "normal"
  }
  ```

### 2.4. Mark as Read

Marks a specific notification as read.

- **Endpoint:** `PUT /api/notifications/:id/read`
- **Authentication:** Required

- **Example Request:**
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"userId": "a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6"}' http://localhost:3000/api/notifications/68afa0b06bff95dfd987b7af/read
  ```

### 2.5. Delete Notification

Deletes a notification for the specified user.

- **Endpoint:** `DELETE /api/notifications/:id`
- **Authentication:** Required

- **Example Request:**
  ```bash
  curl -X DELETE -H "Content-Type: application/json" -d '{"userId": "a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6"}' http://localhost:3000/api/notifications/68afa0b06bff95dfd987b7af
  ```

### 2.6. Get Unread Count

Retrieves the number of unread notifications for a user.

- **Endpoint:** `GET /api/notifications/unread-count`
- **Authentication:** Required
- **Query Parameters:**
  - `userId` (string, required): The ID of the user.

- **Example Request:**
  ```bash
  curl -X GET 'http://localhost:3000/api/notifications/unread-count?userId=a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6'
  ```

### 2.7. Cleanup Expired Notifications

Triggers a cleanup process to remove old, expired notifications from the database.

- **Endpoint:** `POST /api/notifications/cleanup-expired`
- **Authentication:** Required (Admin/Staff role)

- **Example Request:**
  ```bash
  curl -X POST http://localhost:3000/api/notifications/cleanup-expired
  ```

---

## 3. WebSocket Notifications

The Notification Service provides real-time updates to clients through a WebSocket connection. This is the primary channel for instant notifications, such as appointment reminders and prescription updates.

### 3.1. Connecting to the WebSocket

To receive real-time notifications, clients must establish a WebSocket connection to the API Gateway.

- **Endpoint:** `ws://localhost:3000/ws/notifications`
- **Authentication:** The user's JWT must be passed as a query parameter.

- **Example Client (JavaScript):**
  ```javascript
  const token = 'your-jwt-token'; // Replace with the user's actual token
  const wsUrl = `ws://localhost:3000/ws/notifications?token=${token}`;

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('Connected to WebSocket');
  });

  ws.on('message', (data) => {
    const notification = JSON.parse(data);
    console.log('Received notification:', notification);
    // Add your logic to display the notification to the user
  });

  ws.on('close', () => {
    console.log('Disconnected from WebSocket');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
  ```

### 3.2. Notification Format

WebSocket notifications are sent as a JSON string with the following format:

```json
{
  "id": "68af9fc96bff95dfd987b7a1",
  "userId": "a1b2c3d4-e5f6-4c7d-8e9f-f1e2d3c4b5a6",
  "title": "Prescription Ready",
  "message": "Your prescription PX20250828002 is ready for pickup.",
  "type": "prescription",
  "priority": "high",
  "metadata": {
    "recipient_type": "patient"
  },
  "timestamp": "2025-08-28T00:16:09.506Z"
}
```

---

## 4. How It Works: The Notification Flow

1.  **Event Trigger:** An event, such as a prescription status change, occurs in another service (e.g., the `prescription-service`).
2.  **Message Publishing:** The originating service publishes a message to a RabbitMQ exchange with a specific routing key (e.g., `PRESCRIPTION_READY`).
3.  **Message Consumption:** The `notification-service` consumes the message from the RabbitMQ queue.
4.  **Notification Creation:** The `MessageHandler` in the `notification-service` processes the message and creates a notification in the database.
5.  **Multi-Channel Delivery:** The `NotificationService` sends the notification through all configured channels:
    - **WebSocket:** The `WebSocketService` broadcasts the notification in real-time to all connected clients for the specified user.
    - **Email/SMS:** The service sends the notification via the configured email and SMS providers.
6.  **Delivery Logging:** The status of each delivery attempt is logged for auditing and retry purposes.

This architecture ensures that the notification system is decoupled, resilient, and capable of delivering timely and reliable notifications to users.

