import { Router } from 'express';
import { EventController } from '../controllers/EventController';

const router = Router();
const eventController = new EventController();

router.post('/track', (req, res) => eventController.trackEvent(req, res));

export default router;

