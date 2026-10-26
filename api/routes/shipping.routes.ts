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
  requestNimbusPickup,
  getNimbusSettings,
  updateNimbusSettings,
  handleNimbusWebhook,
  createManualShipment,
  recordNimbusManualShipment,
  getOrderPackageDetails,
  resetShipment,
  pushOrderToNimbusManual,
  pushOrderToNimbusPostNewOrders,
  createNimbusPostAutomatedShipment,
  syncNimbusShipment,
  exportNimbusOrderCsv,
  confirmNimbusPostImported,
  markOrderCsvGenerated,
} from '../controllers/shipping.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Shipping Provider Info
router.get('/info', getShippingInfo);

// Package details preview for admin order review
router.get('/order-package/:orderId', authenticate, requireAdmin, getOrderPackageDetails);
router.get('/nimbus/order-package/:orderId', authenticate, requireAdmin, getOrderPackageDetails);

// Country Shipping Rules
router.get('/', getShippingRules);
router.get('/rule/:country', getShippingRuleByCountry);
router.post('/', authenticate, requireAdmin, upsertShippingRule);

// Manual Shipping Routes
router.post('/manual', authenticate, requireAdmin, createManualShipment);
router.post('/manual-shipment', authenticate, requireAdmin, createManualShipment);
router.post('/manual/create', authenticate, requireAdmin, createManualShipment);
router.post('/reset-shipment', authenticate, requireAdmin, resetShipment);

// Option C: Push Complete Order to NimbusPost for Manual Carrier Processing
router.post('/nimbus/push-order', authenticate, requireAdmin, pushOrderToNimbusPostNewOrders);
router.post('/nimbus/push-new-orders', authenticate, requireAdmin, pushOrderToNimbusPostNewOrders);
router.post('/nimbuspost/push-order', authenticate, requireAdmin, pushOrderToNimbusPostNewOrders);
router.post('/push-order', authenticate, requireAdmin, pushOrderToNimbusPostNewOrders);

// Export NimbusPost Bulk Order CSV for 1-click import into NimbusPost New Orders
router.get('/nimbus/export-csv/:orderId', authenticate, requireAdmin, exportNimbusOrderCsv);
router.get('/export-csv/:orderId', authenticate, requireAdmin, exportNimbusOrderCsv);

// Confirm CSV was uploaded to NimbusPost Bulk Upload
router.post('/nimbus/confirm-imported', authenticate, requireAdmin, confirmNimbusPostImported);
router.post('/nimbus/mark-csv-generated', authenticate, requireAdmin, markOrderCsvGenerated);

// Sync Shipment Status with NimbusPost
router.post('/nimbus/sync/:orderId', authenticate, requireAdmin, syncNimbusShipment);
router.post('/nimbus/sync', authenticate, requireAdmin, syncNimbusShipment);
router.post('/sync/:orderId', authenticate, requireAdmin, syncNimbusShipment);

// Option C: Record NimbusPost Manual Shipment
router.post('/nimbus/manual-record', authenticate, requireAdmin, recordNimbusManualShipment);
router.post('/nimbuspost/manual-record', authenticate, requireAdmin, recordNimbusManualShipment);

// NimbusPost Logistics Routes
router.post('/check-serviceability', checkNimbusServiceability);
router.post('/nimbus/check-serviceability', checkNimbusServiceability);
router.post('/nimbuspost/check-serviceability', checkNimbusServiceability);

// Option B: Automated Dispatch / Shipment Creation
router.post('/create-shipment', authenticate, requireAdmin, createNimbusPostAutomatedShipment);
router.post('/nimbus/create-shipment', authenticate, requireAdmin, createNimbusPostAutomatedShipment);
router.post('/nimbus/automated-shipment', authenticate, requireAdmin, createNimbusPostAutomatedShipment);
router.post('/nimbuspost/create', authenticate, requireAdmin, createNimbusPostAutomatedShipment);

router.post('/retry-shipment', authenticate, requireAdmin, retryShipment);
router.post('/nimbus/retry-shipment', authenticate, requireAdmin, retryShipment);

router.get('/track/:awb', trackNimbusShipment);
router.get('/nimbus/track/:awb', trackNimbusShipment);
router.get('/nimbuspost/track/:awb', trackNimbusShipment);

router.post('/cancel', authenticate, requireAdmin, cancelNimbusShipment);
router.post('/nimbus/cancel', authenticate, requireAdmin, cancelNimbusShipment);
router.post('/nimbuspost/cancel', authenticate, requireAdmin, cancelNimbusShipment);

router.post('/pickup/request', authenticate, requireAdmin, requestNimbusPickup);
router.post('/nimbus/pickup/request', authenticate, requireAdmin, requestNimbusPickup);

router.get('/settings', authenticate, requireAdmin, getNimbusSettings);
router.get('/nimbus/settings', authenticate, requireAdmin, getNimbusSettings);
router.put('/settings', authenticate, requireAdmin, updateNimbusSettings);
router.put('/nimbus/settings', authenticate, requireAdmin, updateNimbusSettings);

// Webhook Handlers
router.post('/nimbus/webhook', handleNimbusWebhook);
router.post('/webhook/nimbuspost', handleNimbusWebhook);
router.post('/webhooks/nimbuspost', handleNimbusWebhook);

// Backward compatible parameter route
router.get('/:country', getShippingRuleByCountry);

export default router;
