import prisma from '../api/config/prisma.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';
import { OrderStatus, PaymentStatus, CountryCode, CurrencyCode, PaymentProvider } from '@prisma/client';

async function main() {
  console.log('=== [TEST] Starting NimbusPost Manual Shipping Workflow Verification ===');

  // 1. Create a test domestic Indian order
  const timestamp = Date.now().toString().slice(-6);
  const testOrderNumber = `NCC-TEST-MANUAL-${timestamp}`;

  console.log(`\n1. Creating test order #${testOrderNumber}...`);
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: testOrderNumber,
      country: CountryCode.IN,
      currency: CurrencyCode.INR,
      subtotal: 1299,
      shippingFee: 0,
      discount: 0,
      tax: 0,
      total: 1299,
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.CONFIRMED,
      paymentProvider: PaymentProvider.DEMO,
      shippingAddress: {
        name: 'Dhanya Sree',
        phone: '9876543210',
        email: 'dhanyasree.test@gmail.com',
        addressLine1: 'No 45, 2nd Cross, Indira Nagar 1st Stage',
        addressLine2: 'Near Metro Station',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'IN',
      },
      items: {
        create: [
          {
            name: 'Senior Care Wellness Pack',
            sku: 'SKU-WELL-SENIOR',
            unitPrice: 1299,
            totalPrice: 1299,
            quantity: 1,
            itemType: 'PRODUCT',
            snapshot: {
              name: 'Senior Care Wellness Pack',
              sku: 'SKU-WELL-SENIOR',
              unitPrice: 1299,
            },
          },
        ],
      },
    },
    include: {
      items: true,
      shipment: true,
    },
  });

  console.log(`✓ Test order created with ID: ${testOrder.id}`);

  // 2. Test pushOrderToNimbusManual
  console.log('\n2. Testing pushOrderToNimbusManual...');
  const pushResult = await shippingService.pushOrderToNimbusManual(testOrder.id);

  console.log('Push Result Message:', pushResult.message);
  console.log('Nimbus Order ID:', pushResult.nimbusOrderId);
  console.log('AWB Number:', pushResult.awbNumber || 'Pending in Console');
  console.log('Dashboard URL:', pushResult.dashboardUrl);

  const EXPECTED_MSG = 'Order successfully pushed to NimbusPost. Open NimbusPost to select a shipping partner and complete shipment creation.';
  if (pushResult.message !== EXPECTED_MSG) {
    throw new Error(`Message mismatch! Expected "${EXPECTED_MSG}", got "${pushResult.message}"`);
  }
  console.log('✓ Success message matches user specification exactly!');

  // Verify DB state
  const updatedOrder = await prisma.order.findUnique({
    where: { id: testOrder.id },
    include: {
      shipment: true,
      timeline: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (updatedOrder?.shippingMethod !== 'NIMBUSPOST_MANUAL') {
    throw new Error(`Order shippingMethod expected NIMBUSPOST_MANUAL, got ${updatedOrder?.shippingMethod}`);
  }
  console.log('✓ Order shippingMethod = NIMBUSPOST_MANUAL');

  if (updatedOrder?.shipment?.shippingMethod !== 'NIMBUSPOST_MANUAL') {
    throw new Error(`Shipment shippingMethod expected NIMBUSPOST_MANUAL, got ${updatedOrder?.shipment?.shippingMethod}`);
  }
  console.log('✓ Shipment shippingMethod = NIMBUSPOST_MANUAL');

  if (updatedOrder?.syncStatus !== 'SYNCED') {
    throw new Error(`Order syncStatus expected SYNCED, got ${updatedOrder?.syncStatus}`);
  }
  console.log('✓ Order syncStatus = SYNCED');

  const latestTimeline = updatedOrder.timeline[0];
  console.log(`✓ Latest Timeline event: "${latestTimeline?.title}" - "${latestTimeline?.description}"`);

  // 3. Test Idempotency (prevent duplicate creation)
  console.log('\n3. Testing Idempotency (Second Push Call)...');
  const secondPushResult = await shippingService.pushOrderToNimbusManual(testOrder.id);
  console.log('Second Push Message:', secondPushResult.message);
  console.log('Second Push Nimbus Order ID:', secondPushResult.nimbusOrderId);
  if (secondPushResult.nimbusOrderId !== pushResult.nimbusOrderId) {
    throw new Error('Idempotency failed: Created a duplicate Nimbus Order ID!');
  }
  console.log('✓ Idempotency verified: re-used existing Nimbus Order without creating duplicate.');

  // 4. Test Sync Status
  console.log('\n4. Testing syncNimbusShipmentStatus...');
  const syncResult = await shippingService.syncNimbusShipmentStatus(testOrder.id);
  console.log('Sync Result Message:', syncResult.message);
  console.log('Current Shipment Status:', syncResult.shipment?.shipmentStatus);
  console.log('✓ Sync status completed successfully.');

  // Clean up test order
  console.log('\n5. Cleaning up test order...');
  await prisma.orderTimeline.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.shipment.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.order.delete({ where: { id: testOrder.id } });
  console.log('✓ Test order cleaned up.');

  console.log('\n=== All NimbusPost Manual Workflow tests PASSED successfully! ===');
}

main()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
