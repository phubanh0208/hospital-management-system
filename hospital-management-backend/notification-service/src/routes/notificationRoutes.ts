import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();
const notificationController = new NotificationController();

// Basic notification CRUD
router.get('/', notificationController.getNotifications);
router.post('/', notificationController.createNotification);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Utility endpoints
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/cleanup-expired', notificationController.cleanupExpired);

// Specific notification types (synchronous)
router.post('/send-appointment-reminder', notificationController.sendAppointmentReminder);
router.post('/send-prescription-ready', notificationController.sendPrescriptionReady);

// Async notification endpoints
router.post('/async', notificationController.createNotificationAsync);
router.post('/queue/appointment-reminder', notificationController.queueAppointmentReminder);
router.post('/queue/prescription-ready', notificationController.queuePrescriptionReady);
router.post('/queue/system-alert', notificationController.queueSystemAlert);
router.post('/queue/bulk', notificationController.queueBulkNotification);

export default router;
