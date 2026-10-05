import { Router } from 'express';
import {
  getShippingRules,
  getShippingRuleByCountry,
  upsertShippingRule,
  getShippingInfo,
  checkNimbusServiceability,
  createNimbusShipment,
  retryShipment,
  trackNimbusShipment,
  cancelNimbusShipment,
  getNimbusSettings,
  updateNimbusSettings,
  handleNimbusWebhook,
} from '../controllers/shipping.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Shipping Provider Info
router.get('/info', getShippingInfo);

// Country Shipping Rules
router.get('/', getShippingRules);
router.get('/rule/:country', getShippingRuleByCountry);
router.post('/', authenticate, requireAdmin, upsertShippingRule);

// NimbusPost Logistics Routes
router.post('/check-serviceability', checkNimbusServiceability);
router.post('/nimbus/check-serviceability', checkNimbusServiceability);
router.post('/nimbuspost/check-serviceability', checkNimbusServiceability);

router.post('/create-shipment', authenticate, requireAdmin, createNimbusShipment);
router.post('/nimbus/create-shipment', authenticate, requireAdmin, createNimbusShipment);
router.post('/nimbuspost/create', authenticate, requireAdmin, createNimbusShipment);

router.post('/retry-shipment', authenticate, requireAdmin, retryShipment);
router.post('/nimbus/retry-shipment', authenticate, requireAdmin, retryShipment);

router.get('/track/:awb', trackNimbusShipment);
router.get('/nimbus/track/:awb', trackNimbusShipment);
router.get('/nimbuspost/track/:awb', trackNimbusShipment);

router.post('/cancel', authenticate, requireAdmin, cancelNimbusShipment);
router.post('/nimbus/cancel', authenticate, requireAdmin, cancelNimbusShipment);
router.post('/nimbuspost/cancel', authenticate, requireAdmin, cancelNimbusShipment);

router.get('/settings', authenticate, requireAdmin, getNimbusSettings);
router.get('/nimbus/settings', authenticate, requireAdmin, getNimbusSettings);
router.put('/settings', authenticate, requireAdmin, updateNimbusSettings);
router.put('/nimbus/settings', authenticate, requireAdmin, updateNimbusSettings);

// Webhook Handlers
router.post('/webhook/nimbuspost', handleNimbusWebhook);
router.post('/webhooks/nimbuspost', handleNimbusWebhook);

// Backward compatible parameter route
router.get('/:country', getShippingRuleByCountry);

export default router;
