import { Router } from 'express';
import {
  createPaymentSession,
  verifyPayment,
  handleWebhook,
  getRazorpayConfig,
  processDemoPayment,
} from '../controllers/payment.controller.js';

const router = Router();

// Public Razorpay Configuration (Key ID only)
router.get('/config', getRazorpayConfig);
router.get('/razorpay-key', getRazorpayConfig);

// Dedicated Razorpay Endpoints
router.post('/razorpay/create-order', createPaymentSession);
router.post('/razorpay/verify', verifyPayment);
router.post('/razorpay/webhook', handleWebhook);

// Standard Gateway Endpoints
router.post('/create-session', createPaymentSession);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.post('/webhook/:provider', handleWebhook);

// Disabled Demo Endpoints (Returns 403 Forbidden)
router.all('/demo/*', processDemoPayment);
router.post('/demo/create', processDemoPayment);
router.post('/demo/process', processDemoPayment);

export default router;
