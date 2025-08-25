import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';

router.use('/', createProxyMiddleware({
  target: ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/events': '/api/events',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Gateway] Proxying event request to: ${ANALYTICS_SERVICE_URL}${req.originalUrl}`);
  }
}));

export default router;

