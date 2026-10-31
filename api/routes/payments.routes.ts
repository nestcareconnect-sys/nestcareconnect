import { Router } from 'express';
import {
  createPaymentSession,
  verifyPayment,
  handleWebhook,
  getStripeConfig,
  getRazorpayConfig,
  processDemoPayment,
} from '../controllers/payment.controller.js';

const router = Router();

// Public Stripe / Payment Configuration (Publishable Key only)
router.get('/config', getStripeConfig);
router.get('/stripe-key', getStripeConfig);
router.get('/razorpay-key', getRazorpayConfig);

// Dedicated Stripe Endpoints
router.post('/stripe/create-intent', createPaymentSession);
router.post('/stripe/create-order', createPaymentSession);
router.post('/stripe/verify', verifyPayment);
router.post('/stripe/webhook', handleWebhook);

// Dedicated Legacy Razorpay Endpoints (routed safely)
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
