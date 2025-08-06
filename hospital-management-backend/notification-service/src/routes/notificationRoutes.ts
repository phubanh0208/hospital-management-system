import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();
const notificationController = new NotificationController();

// Utility endpoints
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/cleanup-expired', notificationController.cleanupExpired);

// Basic notification CRUD
router.get('/', notificationController.getNotifications);
router.post('/', notificationController.createNotification);
router.get('/:id', notificationController.getNotificationById);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Specific notification types (synchronous)
router.post('/send-appointment-reminder', notificationController.sendAppointmentReminder);
router.post('/send-prescription-ready', notificationController.sendPrescriptionReady);

// Async notification endpoints
router.post('/async', notificationController.createNotificationAsync);
router.post('/queue/appointment-reminder', notificationController.queueAppointmentReminder);
router.post('/queue/prescription-ready', notificationController.queuePrescriptionReady);
router.post('/queue/system-alert', notificationController.queueSystemAlert);
router.post('/queue/bulk', notificationController.queueBulkNotification);

// Admin endpoints
router.get('/admin/retry-stats', notificationController.getRetryStatistics);
router.post('/admin/process-retries', notificationController.processRetries);
router.post('/admin/cleanup-retries', notificationController.cleanupRetries);
router.post('/admin/test-notification', notificationController.testNotification);

export default router;
