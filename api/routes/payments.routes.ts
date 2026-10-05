import { Router } from 'express';
import { createPaymentSession, verifyPayment, handleWebhook, processDemoPayment } from '../controllers/payment.controller.js';

const router = Router();

// Demo Payment Endpoints
router.post('/demo/create', createPaymentSession);
router.post('/demo/process', processDemoPayment);
router.post('/demo/success', (req, res) => {
  req.body.action = 'SUCCESS';
  return processDemoPayment(req, res);
});
router.post('/demo/failure', (req, res) => {
  req.body.action = 'FAILED';
  return processDemoPayment(req, res);
});
router.post('/demo/pending', (req, res) => {
  req.body.action = 'PENDING';
  return processDemoPayment(req, res);
});

// Dedicated Razorpay Endpoints
router.post('/razorpay/create-order', createPaymentSession);
router.post('/razorpay/verify', verifyPayment);
router.post('/razorpay/webhook', handleWebhook);

// Standard Gateway Endpoints
router.post('/create-session', createPaymentSession);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.post('/webhook/:provider', handleWebhook);

export default router;

