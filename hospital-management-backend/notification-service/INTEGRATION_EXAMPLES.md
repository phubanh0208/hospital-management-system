# 🔗 Integration Examples & Flow Diagrams

## 🎯 Quick Start Integration

### 1. **Frontend React Component Example**

```jsx
// NotificationService.js
class NotificationService {
  constructor(baseURL = 'http://localhost:3005') {
    this.baseURL = baseURL;
  }

  async sendAppointmentReminder(appointmentData) {
    const response = await fetch(`${this.baseURL}/api/notifications/send-appointment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(appointmentData)
    });
    
    return response.json();
  }

  async getUserNotifications(userId, page = 1, limit = 10) {
    const params = new URLSearchParams({ userId, page, limit });
    const response = await fetch(`${this.baseURL}/api/notifications?${params}`);
    return response.json();
  }

  async markAsRead(notificationId, userId) {
    const response = await fetch(`${this.baseURL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return response.json();
  }
}

// React Component
import React, { useState, useEffect } from 'react';

const NotificationPanel = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationService = new NotificationService();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:3005/ws/notifications');
    ws.onmessage = (event) => {
      const newNotification = JSON.parse(event.data);
      if (newNotification.userId === userId) {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };
    
    return () => ws.close();
  }, [userId]);

  const loadNotifications = async () => {
    const response = await notificationService.getUserNotifications(userId);
    setNotifications(response.data.notifications);
  };

  const loadUnreadCount = async () => {
    const response = await fetch(`http://localhost:3005/api/notifications/unread-count?userId=${userId}`);
    const data = await response.json();
    setUnreadCount(data.data.unreadCount);
  };

  const handleMarkAsRead = async (notificationId) => {
    await notificationService.markAsRead(notificationId, userId);
    loadNotifications();
    loadUnreadCount();
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>
      
      <div className="notification-list">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-item ${notification.status === 'read' ? 'read' : 'unread'}`}
          >
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <small>{new Date(notification.created_at).toLocaleDateString()}</small>
            </div>
            {notification.status !== 'read' && (
              <button onClick={() => handleMarkAsRead(notification.id)}>
                Mark as Read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;
```

### 2. **Backend Node.js Service Integration**

```javascript
// AppointmentService.js
const axios = require('axios');

class AppointmentService {
  constructor() {
    this.notificationServiceURL = 'http://localhost:3005';
  }

  async createAppointment(appointmentData) {
    try {
      // Save appointment to database
      const appointment = await this.saveAppointmentToDB(appointmentData);
      
      // Send immediate confirmation notification
      await this.sendAppointmentConfirmation(appointment);
      
      // Schedule reminder notification for 24h before
      await this.scheduleAppointmentReminder(appointment);
      
      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async sendAppointmentConfirmation(appointment) {
    try {
      const notificationData = {
        recipient_user_id: appointment.patient_id,
        recipient_type: 'patient',
        title: 'Appointment Confirmed',
        message: `Your appointment with ${appointment.doctor_name} has been confirmed for ${appointment.date} at ${appointment.time}`,
        type: 'appointment',
        priority: 'normal',
        channels: ['web', 'email']
      };

      await axios.post(`${this.notificationServiceURL}/api/notifications`, notificationData);
      console.log('Appointment confirmation sent');
    } catch (error) {
      console.error('Failed to send appointment confirmation:', error);
    }
  }

  async scheduleAppointmentReminder(appointment) {
    try {
      // Calculate reminder time (24 hours before appointment)
      const appointmentTime = new Date(appointment.date + 'T' + appointment.time);
      const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
      
      // Schedule async reminder
      const reminderData = {
        recipient_user_id: appointment.patient_id,
        patient_name: appointment.patient_name,
        doctor_name: appointment.doctor_name,
        appointment_date: appointment.date,
        appointment_time: appointment.time,
        appointment_number: appointment.number,
        room_number: appointment.room_number,
        reason: appointment.reason
      };

      await axios.post(`${this.notificationServiceURL}/api/notifications/queue/appointment-reminder`, reminderData);
      console.log('Appointment reminder scheduled');
    } catch (error) {
      console.error('Failed to schedule appointment reminder:', error);
    }
  }

  async cancelAppointment(appointmentId, reason) {
    try {
      const appointment = await this.getAppointmentById(appointmentId);
      
      // Update appointment status
      await this.updateAppointmentStatus(appointmentId, 'cancelled');
      
      // Send cancellation notification
      const notificationData = {
        recipient_user_id: appointment.patient_id,
        recipient_type: 'patient',
        title: 'Appointment Cancelled',
        message: `Your appointment scheduled for ${appointment.date} at ${appointment.time} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'appointment',
        priority: 'high',
        channels: ['web', 'email', 'sms']
      };

      await axios.post(`${this.notificationServiceURL}/api/notifications`, notificationData);
      console.log('Cancellation notification sent');
      
      return { success: true, message: 'Appointment cancelled and notification sent' };
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }
}

module.exports = AppointmentService;
```

### 3. **Prescription Service Integration**

```javascript
// PrescriptionService.js
const axios = require('axios');

class PrescriptionService {
  constructor() {
    this.notificationServiceURL = 'http://localhost:3005';
  }

  async markPrescriptionReady(prescriptionId) {
    try {
      const prescription = await this.getPrescriptionById(prescriptionId);
      
      // Update prescription status
      await this.updatePrescriptionStatus(prescriptionId, 'ready');
      
      // Send notification with rich template
      const notificationData = {
        recipient_user_id: prescription.patient_id,
        patient_name: prescription.patient_name,
        doctor_name: prescription.doctor_name,
        prescription_number: prescription.number,
        issued_date: prescription.issued_date,
        total_cost: prescription.total_cost
      };

      await axios.post(`${this.notificationServiceURL}/api/notifications/send-prescription-ready`, notificationData);
      
      console.log('Prescription ready notification sent');
      return { success: true, message: 'Prescription marked as ready and notification sent' };
    } catch (error) {
      console.error('Error marking prescription ready:', error);
      throw error;
    }
  }

  async sendPrescriptionExpiry(prescriptionId) {
    try {
      const prescription = await this.getPrescriptionById(prescriptionId);
      
      const notificationData = {
        recipient_user_id: prescription.patient_id,
        recipient_type: 'patient',
        title: 'Prescription Expiring Soon',
        message: `Your prescription ${prescription.number} will expire in 7 days. Please contact your doctor for renewal if needed.`,
        type: 'prescription',
        priority: 'normal',
        channels: ['web', 'email']
      };

      await axios.post(`${this.notificationServiceURL}/api/notifications`, notificationData);
      console.log('Prescription expiry notification sent');
    } catch (error) {
      console.error('Failed to send prescription expiry notification:', error);
    }
  }
}

module.exports = PrescriptionService;
```

## 🔄 Data Flow Diagrams

### Synchronous Notification Flow
```
Frontend/App Service
    ↓ HTTP Request
API Gateway (Optional)
    ↓ Forward Request
Notification Service API
    ↓ Validate & Process
NotificationService.createNotification()
    ↓ Save to DB
MongoDB (Notification Record)
    ↓ Send Immediately
Email/SMS/Web Services
    ↓ Delivery Attempt
External Providers (Gmail/Twilio)
    ↓ Success/Failure
Update Delivery Status
    ↓ Response
Return Status to Client
```

### Asynchronous Notification Flow
```
Frontend/App Service
    ↓ HTTP Request
Notification Service API
    ↓ Queue Message
RabbitMQ Exchange
    ↓ Route to Queue
Notification Queue
    ↓ Consume Message
Background Message Handler
    ↓ Process Notification
NotificationService.sendNotification()
    ↓ Multi-Channel Delivery
Email/SMS/Web Services
    ↓ Delivery Results
Update Status & Schedule Retries
```

### Retry Flow Diagram
```
Failed Delivery
    ↓ Log Error
Retry Schedule Service
    ↓ Calculate Next Attempt
RabbitMQ Retry Queue (with TTL)
    ↓ After Delay
Retry Message Handler
    ↓ Attempt Delivery
Email/SMS Services
    ↓ Success?
    Yes → Mark as Sent
    No → Check Max Retries
        ↓ Under Limit?
        Yes → Schedule Next Retry
        No → Mark as Failed
```

## 📱 Mobile Integration Example

### React Native with Push Notifications

```javascript
// NotificationManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

class NotificationManager {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async registerForNotifications(userId, deviceToken) {
    try {
      // Register device token with notification service
      const response = await fetch(`${this.baseURL}/api/notifications/register-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, deviceToken, platform: Platform.OS })
      });
      
      return response.json();
    } catch (error) {
      console.error('Failed to register for notifications:', error);
    }
  }

  async syncNotifications(userId) {
    try {
      const response = await fetch(`${this.baseURL}/api/notifications?userId=${userId}`);
      const data = await response.json();
      
      // Store locally for offline access
      await AsyncStorage.setItem('notifications', JSON.stringify(data.data.notifications));
      
      return data.data.notifications;
    } catch (error) {
      console.error('Failed to sync notifications:', error);
      // Return cached notifications
      const cached = await AsyncStorage.getItem('notifications');
      return cached ? JSON.parse(cached) : [];
    }
  }

  async handleNotificationTap(notificationId, userId) {
    try {
      // Mark as read
      await fetch(`${this.baseURL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      // Navigate to relevant screen
      this.navigateToNotificationDetail(notificationId);
    } catch (error) {
      console.error('Failed to handle notification tap:', error);
    }
  }
}

export default new NotificationManager();
```

## 🎛️ Admin Dashboard Integration

### Dashboard API Calls

```javascript
// AdminNotificationService.js
class AdminNotificationService {
  constructor() {
    this.baseURL = 'http://localhost:3005';
  }

  async getSystemHealth() {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  async getRetryStatistics(timeframe = '24 hours') {
    const response = await fetch(`${this.baseURL}/api/notifications/admin/retry-stats?timeframe=${encodeURIComponent(timeframe)}`);
    return response.json();
  }

  async processRetries() {
    const response = await fetch(`${this.baseURL}/api/notifications/admin/process-retries`, {
      method: 'POST'
    });
    return response.json();
  }

  async sendTestNotification(testData) {
    const response = await fetch(`${this.baseURL}/api/notifications/admin/test-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    return response.json();
  }

  async sendBulkAnnouncement(announcementData) {
    const response = await fetch(`${this.baseURL}/api/notifications/queue/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcementData)
    });
    return response.json();
  }

  async getNotificationAnalytics(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseURL}/api/notifications/admin/analytics?${params}`);
    return response.json();
  }
}

// React Dashboard Component
const AdminDashboard = () => {
  const [health, setHealth] = useState({});
  const [retryStats, setRetryStats] = useState({});
  const adminService = new AdminNotificationService();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [healthData, statsData] = await Promise.all([
        adminService.getSystemHealth(),
        adminService.getRetryStatistics()
      ]);
      
      setHealth(healthData);
      setRetryStats(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await adminService.sendTestNotification({
        recipient_user_id: 'admin_test',
        title: 'Test Notification',
        message: 'This is a test notification from admin dashboard',
        channels: ['email']
      });
      alert('Test notification sent successfully!');
    } catch (error) {
      alert('Failed to send test notification');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Notification Service Dashboard</h2>
      </div>

      <div className="health-status">
        <h3>System Health</h3>
        <div className="health-indicators">
          <div className={`indicator ${health.database?.mongodb ? 'healthy' : 'unhealthy'}`}>
            Database: {health.database?.mongodb ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`indicator ${health.messageQueue?.rabbitmq ? 'healthy' : 'unhealthy'}`}>
            RabbitMQ: {health.messageQueue?.rabbitmq ? 'Connected' : 'Disconnected'}
          </div>
          <div className="indicator">
            Uptime: {Math.round(health.uptime / 60)} minutes
          </div>
        </div>
      </div>

      <div className="retry-statistics">
        <h3>Retry Statistics</h3>
        <pre>{JSON.stringify(retryStats.data, null, 2)}</pre>
      </div>

      <div className="admin-actions">
        <h3>Actions</h3>
        <button onClick={handleSendTestNotification}>Send Test Notification</button>
        <button onClick={() => adminService.processRetries()}>Process Pending Retries</button>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

## 🔧 Environment Setup

### Docker Compose Integration

```yaml
# docker-compose.yml
version: '3.8'
services:
  notification-service:
    build: ./notification-service
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/hospital_notifications
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - EMAIL_HOST=smtp.gmail.com
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    depends_on:
      - mongo
      - rabbitmq
    networks:
      - hospital-network

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - hospital-network

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - hospital-network

volumes:
  mongo_data:
  rabbitmq_data:

networks:
  hospital-network:
    driver: bridge
```

This comprehensive guide provides everything you need to integrate the notification service into your hospital management system! 🏥✨
