import prisma from '../api/config/prisma.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';
import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';
import { PaymentStatus, OrderStatus, PaymentProvider, ItemType } from '@prisma/client';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING NIMBUSPOST TEST SHIPPING INTEGRATION TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Provider and Test Mode Configuration
    console.log('\n--- 1. Testing Shipping Provider Abstraction & Config ---');
    const provider = shippingService.getProvider('NIMBUSPOST');
    assert(provider.name === 'NIMBUSPOST', 'Provider name is NIMBUSPOST');
    assert(provider.isTestMode === true, 'Provider is running in Test/Sandbox mode');

    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();
    assert(config.env === 'test', 'Config environment is TEST');
    assert(typeof config.baseUrl === 'string' && config.baseUrl.length > 0, 'Config base URL is present');
    assert(!config.apiKey?.includes('fake_hardcoded'), 'No hardcoded credentials');

    // Test 2: Pincode Serviceability in Test Mode
    console.log('\n--- 2. Testing Pincode Serviceability & Courier Rates ---');
    const servResult = await shippingService.checkServiceability({
      destinationPincode: '670001', // Kannur, Kerala
      weightKg: 1.0,
    });
    assert(servResult.serviceable === true, 'Destination PIN 670001 is serviceable');
    assert(servResult.city.includes('Kannur') || servResult.city.includes('Kerala') || servResult.city.length > 0, 'Resolved city name');
    assert(servResult.couriers.length > 0, 'Available courier rates returned');
    assert(servResult.couriers[0].rate > 0, `First courier rate: ₹${servResult.couriers[0].rate}`);

    // Test 3: Invalid Address Rejection (PIN code validation)
    console.log('\n--- 3. Testing Address Validation Safety ---');
    const invalidAddressCheck = shippingService.validateDeliveryAddress({
      name: 'A',
      phone: '',
      addressLine1: 'Short',
      city: '',
      postalCode: '123',
    });
    assert(invalidAddressCheck.isValid === false, 'Invalid address rejected before shipping API call');

    const validAddressCheck = shippingService.validateDeliveryAddress({
      name: 'Test Customer',
      phone: '+919999999999',
      addressLine1: 'Test Address, Main Road',
      city: 'Kannur',
      state: 'Kerala',
      postalCode: '670001',
      country: 'India',
    });
    assert(validAddressCheck.isValid === true, 'Valid Kannur test address accepted');

    // Test 4: Product Order with Demo Payment Success
    console.log('\n--- 4. Testing Product Order + Demo Payment Success Workflow ---');
    const testOrderNumber1 = `NCC-TEST-${Date.now().toString().slice(-6)}`;
    const order1 = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber1,
        country: 'IN',
        currency: 'INR',
        subtotal: 1000,
        total: 1000,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: PaymentProvider.DEMO,
        transactionId: `demo_pay_${Date.now()}`,
        shippingAddress: {
          name: 'Test Customer',
          phone: '+919999999999',
          addressLine1: 'Test Address 123',
          city: 'Kannur',
          state: 'Kerala',
          postalCode: '670001',
          country: 'India',
        },
        items: {
          create: [
            {
              itemType: ItemType.PRODUCT,
              name: 'Orthopedic Support Cushion',
              sku: 'SKU-ORTHO-CUSHION',
              unitPrice: 1000,
              quantity: 1,
              totalPrice: 1000,
              snapshot: { weight: 0.8 },
            },
          ],
        },
      },
      include: { items: true },
    });

    const shipmentResult1 = await shippingService.createShipmentForOrder(order1.id);
    assert(!!shipmentResult1.awbNumber, `Test shipment created with AWB: ${shipmentResult1.awbNumber}`);
    assert(!!shipmentResult1.courierName, `Courier assigned: ${shipmentResult1.courierName}`);
    assert(shipmentResult1.isTestMode === true, 'Shipment marked as isTestMode');

    // Verify DB record
    const savedShipment1 = await prisma.shipment.findUnique({ where: { orderId: order1.id } });
    assert(savedShipment1 !== null, 'Shipment record persisted in DB');
    assert(savedShipment1?.awbNumber === shipmentResult1.awbNumber, 'Saved AWB matches returned AWB');

    const updatedOrder1 = await prisma.order.findUnique({ where: { id: order1.id } });
    assert(updatedOrder1?.trackingNumber === shipmentResult1.awbNumber, 'Order trackingNumber updated');
    assert(updatedOrder1?.orderStatus === OrderStatus.SHIPPED, 'Order status updated to SHIPPED');

    // Test 5: Idempotency Protection (Double call / Refresh)
    console.log('\n--- 5. Testing Idempotency & Duplicate Protection ---');
    const duplicateCallResult = await shippingService.createShipmentForOrder(order1.id);
    assert(duplicateCallResult.awbNumber === shipmentResult1.awbNumber, 'Duplicate call returned existing AWB without creating duplicate');

    const shipmentCount = await prisma.shipment.count({ where: { orderId: order1.id } });
    assert(shipmentCount === 1, 'Only 1 shipment record exists in DB for this order');

    // Test 6: Payment NOT Paid does NOT create shipment
    console.log('\n--- 6. Testing Unpaid / Pending Payment Safety ---');
    const testOrderNumber2 = `NCC-TEST-PENDING-${Date.now().toString().slice(-6)}`;
    const pendingOrder = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber2,
        country: 'IN',
        currency: 'INR',
        subtotal: 500,
        total: 500,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: PaymentProvider.DEMO,
        shippingAddress: {
          name: 'Test Customer',
          phone: '+919999999999',
          addressLine1: 'Test Address',
          city: 'Kannur',
          state: 'Kerala',
          postalCode: '670001',
        },
        items: {
          create: [
            {
              itemType: ItemType.PRODUCT,
              name: 'Health Monitor',
              sku: 'SKU-MONITOR',
              unitPrice: 500,
              quantity: 1,
              totalPrice: 500,
              snapshot: {},
            },
          ],
        },
      },
    });

    let pendingThrew = false;
    try {
      await shippingService.createShipmentForOrder(pendingOrder.id);
    } catch (err: any) {
      pendingThrew = true;
    }
    assert(pendingThrew, 'Attempt to create shipment for PENDING order was rejected');

    // Test 7: Custom Hamper Weight & Dimensions
    console.log('\n--- 7. Testing Customized Hamper Weight & Box Dimensions ---');
    const testOrderNumber3 = `NCC-HAMPER-${Date.now().toString().slice(-6)}`;
    const hamperOrder = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber3,
        country: 'IN',
        currency: 'INR',
        subtotal: 2500,
        total: 2500,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: PaymentProvider.DEMO,
        transactionId: `demo_pay_h_${Date.now()}`,
        shippingAddress: {
          name: 'Grandma Mary',
          phone: '+919876543210',
          addressLine1: 'Green Villa, Fort Road',
          city: 'Kannur',
          state: 'Kerala',
          postalCode: '670001',
        },
        items: {
          create: [
            {
              itemType: ItemType.CUSTOM_HAMPER,
              name: 'Custom Healthcare Hamper in Premium Wooden Box',
              sku: 'NCC-CUSTOM-HAMPER',
              unitPrice: 2500,
              quantity: 1,
              totalPrice: 2500,
              snapshot: {
                box: {
                  name: 'Signature Emerald Hamper Box',
                  length: 32,
                  width: 22,
                  height: 14,
                  dimensions: '32 x 22 x 14 cm',
                  maxWeight: 4.0,
                },
                breakdown: [
                  { name: 'Blood Pressure Monitor', quantity: 1, unitPrice: 1500 },
                  { name: 'Herbal Infusion Tea', quantity: 2, unitPrice: 300 },
                  { name: 'Thermal Grip Mug', quantity: 1, unitPrice: 400 },
                ],
                personalization: {
                  customMessage: 'Wishing you quick recovery with all our love!',
                  photos: ['https://example.com/family-photo.jpg'],
                },
              },
            },
          ],
        },
      },
      include: { items: true },
    });

    const pkgDetails = await shippingService.calculatePackageDetails(hamperOrder);
    assert(pkgDetails.isCustomHamper === true, 'Identified as custom hamper');
    assert(pkgDetails.weightKg > 0.5, `Calculated custom hamper weight: ${pkgDetails.weightKg}kg`);
    assert(pkgDetails.dimensions.length === 32, `Box length matched: ${pkgDetails.dimensions.length}cm`);
    assert(pkgDetails.dimensions.breadth === 22, `Box breadth matched: ${pkgDetails.dimensions.breadth}cm`);
    assert(pkgDetails.dimensions.height === 14, `Box height matched: ${pkgDetails.dimensions.height}cm`);

    const hamperShipment = await shippingService.createShipmentForOrder(hamperOrder.id);
    assert(!!hamperShipment.awbNumber, `Hamper shipment created with AWB: ${hamperShipment.awbNumber}`);

    // Test 8: Live Tracking Check
    console.log('\n--- 8. Testing Live Tracking Endpoint ---');
    const trackingRes = await shippingService.trackShipment(hamperShipment.awbNumber);
    assert(trackingRes !== null, 'Tracking result returned');
    assert(trackingRes?.awbNumber === hamperShipment.awbNumber, 'Tracking AWB matched');
    assert(trackingRes?.history.length! >= 3, `Tracking has ${trackingRes?.history.length} checkpoints`);

    // Clean up test records
    await prisma.shipment.deleteMany({
      where: { orderId: { in: [order1.id, pendingOrder.id, hamperOrder.id] } },
    });
    await prisma.orderTimeline.deleteMany({
      where: { orderId: { in: [order1.id, pendingOrder.id, hamperOrder.id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [order1.id, pendingOrder.id, hamperOrder.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [order1.id, pendingOrder.id, hamperOrder.id] } },
    });

    console.log('\n======================================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('💥 Test suite encountered unhandled error:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);
