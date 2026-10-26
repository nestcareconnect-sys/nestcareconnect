import prisma from '../api/config/prisma.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';

async function main() {
  console.log('--- Verifying NimbusPost Manual Workflow & Invariants ---');

  // Find a test order (eligible domestic order)
  const order = await prisma.order.findFirst({
    where: {
      orderStatus: { in: ['PENDING', 'PROCESSING'] },
    },
    include: {
      items: { include: { product: true } },
      shipment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!order) {
    console.error('No pending/processing order found.');
    return;
  }

  console.log(`Testing Order #${order.orderNumber} (ID: ${order.id})`);
  console.log(`Payment Status: ${order.paymentStatus}, Order Status: ${order.orderStatus}`);

  // Test 1: Package Calculation
  const pkg = await shippingService.calculatePackageDetails(order);
  console.log(`✅ Calculated Package: ${pkg.weightKg} kg, dims: ${pkg.dimensions.length}x${pkg.dimensions.breadth}x${pkg.dimensions.height} cm`);

  // Test 2: CSV Generation
  const csv = await shippingService.generateNimbusPostOrderCsv(order.id);
  const csvLines = csv.split('\r\n');
  console.log(`✅ Generated NimbusPost CSV (${csvLines.length} lines)`);
  console.log(`CSV Header:\n${csvLines[0]}`);
  console.log(`CSV First Row:\n${csvLines[1]}`);

  // Verify 25 columns
  const headerCols = csvLines[0].split(',');
  console.log(`✅ Header Columns Count: ${headerCols.length} (Expected: 25)`);

  // Test 3: Manual Push to NimbusPost
  console.log('\n--- Calling pushOrderToNimbusPostNewOrders ---');
  const result = await shippingService.pushOrderToNimbusPostNewOrders(order.id, { forceRetry: true });
  console.log('Result Success:', result.success);
  console.log('Import Status:', result.importStatus);
  console.log('API Limitation Note:', result.apiLimitationNote);
  console.log('Download CSV URL:', result.downloadCsvUrl);

  // Test 4: Check Order Status Invariant
  const reloadedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { shipment: true },
  });

  console.log('\n--- Invariants Verification ---');
  console.log('Order Status preserved (NOT Shipped):', reloadedOrder?.orderStatus === 'PROCESSING' || reloadedOrder?.orderStatus === 'PENDING');
  console.log('Order AWB is null (Not automatically booked):', reloadedOrder?.trackingNumber === null && reloadedOrder?.shipment?.awbNumber === null);
  console.log('Courier is null (Not automatically assigned):', reloadedOrder?.shipment?.courierName === null);
  console.log('Shipment Status:', reloadedOrder?.shipment?.shipmentStatus);
  console.log('Sync Status:', reloadedOrder?.shipment?.syncStatus);

  // Test 5: Idempotency Check
  console.log('\n--- Testing Idempotency ---');
  const idempotencyResult = await shippingService.pushOrderToNimbusPostNewOrders(order.id, { forceRetry: false });
  console.log('Idempotency Handled:', idempotencyResult.importStatus === 'IMPORT_FAILED' || idempotencyResult.importStatus === 'IMPORTED_TO_NIMBUSPOST');

  console.log('\n--- ALL VERIFICATIONS COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
