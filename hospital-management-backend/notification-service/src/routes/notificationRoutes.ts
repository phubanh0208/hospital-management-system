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

// Specific notification types
router.post('/send-appointment-reminder', notificationController.sendAppointmentReminder);
router.post('/send-prescription-ready', notificationController.sendPrescriptionReady);

export default router;
