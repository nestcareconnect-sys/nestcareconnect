import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service.js';

const router = Router();

/**
 * MSG91 Email Delivery Webhook Callback Endpoint
 * Receives delivery reports, bounce notices, and delivery updates from MSG91
 */
router.post('/msg91', async (req: Request, res: Response) => {
  try {
    const secret = process.env.MSG91_WEBHOOK_SECRET?.trim();
    if (secret) {
      const headerSecret = (req.headers['x-msg91-webhook-token'] || req.headers['x-webhook-token'] || req.query.secret) as string;
      if (headerSecret !== secret) {
        console.warn('[MSG91 Webhook] Rejected unauthorized callback: invalid secret token.');
        return res.status(401).json({ success: false, message: 'Unauthorized webhook request.' });
      }
    }

    const payload = req.body;
    console.log('[MSG91 Webhook] Received email delivery event:', JSON.stringify(payload).slice(0, 200));

    const result = await emailService.handleWebhookDeliveryReport(payload);
    return res.status(200).json({ success: true, handled: result.handled, status: result.status });
  } catch (err: any) {
    console.error('[MSG91 Webhook] Error processing callback:', err.message);
    // Respond with 200 OK as required by MSG91 within 8000ms
    return res.status(200).json({ success: true, handled: false, error: err.message });
  }
});

export default router;
