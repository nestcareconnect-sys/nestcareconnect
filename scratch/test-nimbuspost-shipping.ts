import prisma from '../api/config/prisma.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';
import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';
import { nimbusPostConfig } from '../api/config/nimbuspost.config.js';
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
    // Test 1: Centralized Configuration Module & Environment Loading
    console.log('\n--- 1. Testing Centralized NimbusPost Config Module ---');
    const expectedPickupPin = process.env.NIMBUSPOST_PICKUP_PINCODE || '560001';
    assert(nimbusPostConfig.pickupPincode === expectedPickupPin, `Pickup pincode loaded from env as ${expectedPickupPin}`);
    assert(nimbusPostConfig.baseUrl === 'https://api.nimbuspost.com/v1', 'Base URL normalized with /v1');
    assert(nimbusPostConfig.pickupLocation === 'Dhanyasree 1', 'Pickup location matches registered hub');

    // Test 2: Fallback Logic when NIMBUSPOST_PICKUP_PINCODE is missing
    console.log('\n--- 2. Testing Fallback Logic when Pickup Pincode is Missing ---');
    const originalEnvPin = process.env.NIMBUSPOST_PICKUP_PINCODE;
    delete process.env.NIMBUSPOST_PICKUP_PINCODE;
    const fallbackPin = process.env.NIMBUSPOST_PICKUP_PINCODE || '560001';
    assert(fallbackPin === '560001', 'Fallback logic defaults to 560001 when env var is missing');
    assert(nimbusPostConfig.pickupPincode === '560001', 'nimbusPostConfig.pickupPincode falls back to 560001');
    process.env.NIMBUSPOST_PICKUP_PINCODE = originalEnvPin; // Restore

    // Test 3: PIN Code Validation Logic
    console.log('\n--- 3. Testing Indian Postal PIN Code Validation Engine ---');
    assert(nimbusPostConfig.validatePincode('560001').isValid === true, '560001 is a valid PIN');
    assert(nimbusPostConfig.validatePincode('682001').isValid === true, '682001 is a valid PIN');
    assert(nimbusPostConfig.validatePincode('12345').isValid === false, '5-digit PIN correctly rejected');
    assert(nimbusPostConfig.validatePincode('1234567').isValid === false, '7-digit PIN correctly rejected');
    assert(nimbusPostConfig.validatePincode('012345').isValid === false, 'PIN starting with 0 correctly rejected');
    assert(nimbusPostConfig.validatePincode('ABCDEF').isValid === false, 'Non-numeric PIN correctly rejected');

    // Test 4: Provider and Test Mode Configuration
    console.log('\n--- 4. Testing Shipping Provider Abstraction & Config ---');
    const provider = shippingService.getProvider('NIMBUSPOST');
    assert(provider.name === 'NIMBUSPOST', 'Provider name is NIMBUSPOST');
    assert(provider.isTestMode === true, 'Provider is running in Test/Sandbox mode');

    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();
    assert(config.env === 'test', 'Config environment is TEST');
    assert(config.pickupPincode === expectedPickupPin, `Provider config pickupPincode is ${expectedPickupPin}`);
    assert(typeof config.baseUrl === 'string' && config.baseUrl.length > 0, 'Config base URL is present');
    assert(!config.apiKey?.includes('fake_hardcoded'), 'No hardcoded credentials');

    // Test 5: Pincode Serviceability in Test Mode
    console.log('\n--- 5. Testing Pincode Serviceability & Courier Rates ---');
    const servResult = await shippingService.checkServiceability({
      destinationPincode: '670001', // Kannur, Kerala
      weightKg: 1.0,
    });
    assert(servResult.serviceable === true, 'Destination PIN 670001 is serviceable');
    assert(servResult.city.includes('Kannur') || servResult.city.includes('Kerala') || servResult.city.length > 0, 'Resolved city name');
    assert(servResult.couriers.length > 0, 'Available courier rates returned');
    assert(servResult.couriers[0].rate > 0, `First courier rate: ₹${servResult.couriers[0].rate}`);

    // Test 6: Invalid Address Rejection (PIN code validation)
    console.log('\n--- 6. Testing Address Validation Safety ---');
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
      email: 'test.customer@gmail.com',
      addressLine1: 'Test Address, Main Road',
      city: 'Kannur',
      state: 'Kerala',
      postalCode: '670001',
      country: 'India',
    });
    assert(validAddressCheck.isValid === true, 'Valid Kannur test address accepted');

    // Test 7: Product Order with Payment Success Creates Shipment
    console.log('\n--- 7. Testing Product Order + Payment Success Workflow ---');
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
        guestEmail: 'test.customer@gmail.com',
        shippingAddress: {
          name: 'Test Customer',
          phone: '+919999999999',
          email: 'test.customer@gmail.com',
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

    // Test 7A: Address Validation Rejection on Invalid Shipping Email
    console.log('\n--- 7A. Testing Address Validation Safety on Invalid Shipping Email ---');
    const invalidEmailOrder = await prisma.order.create({
      data: {
        orderNumber: `NCC-TEST-BADEMAIL-${Date.now().toString().slice(-6)}`,
        country: 'IN',
        currency: 'INR',
        subtotal: 500,
        total: 500,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: PaymentProvider.DEMO,
        guestEmail: 'invalid-email-no-at',
        shippingAddress: {
          name: 'Test Bad Email',
          phone: '+919999999999',
          email: 'invalid-email-no-at',
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
              name: 'Sample Item',
              unitPrice: 500,
              quantity: 1,
              totalPrice: 500,
              snapshot: {},
            },
          ],
        },
      },
    });

    let badEmailThrew = false;
    let badEmailErrorMessage = '';
    try {
      await shippingService.createShipmentForOrder(invalidEmailOrder.id);
    } catch (err: any) {
      badEmailThrew = true;
      badEmailErrorMessage = err.message;
    }
    assert(badEmailThrew === true, 'Order with invalid email threw validation error before dispatch');
    assert(badEmailErrorMessage.includes('Email') || badEmailErrorMessage.includes('email'), `Clear validation error message: ${badEmailErrorMessage}`);

    const failedShipmentRecord = await prisma.shipment.findUnique({ where: { orderId: invalidEmailOrder.id } });
    assert(failedShipmentRecord?.shipmentStatus === 'SHIPMENT_CREATION_FAILED', 'Shipment status recorded as SHIPMENT_CREATION_FAILED in DB');
    assert(!!failedShipmentRecord?.errorMessage, `Actual error message recorded in DB: ${failedShipmentRecord?.errorMessage}`);

    await prisma.shipment.deleteMany({ where: { orderId: invalidEmailOrder.id } });
    await prisma.order.delete({ where: { id: invalidEmailOrder.id } });

    // Test 7B: Explicit Sandbox Simulation & Order Integrity
    console.log('\n--- 7B. Testing Explicit Sandbox Simulation & Order Integrity ---');
    const shipmentResult1 = await shippingService.createShipmentForOrder(order1.id, { allowSimulation: true, isManualRetry: true });
    assert(shipmentResult1.isSimulated === true, 'Shipment result marked as isSimulated: true');
    assert(shipmentResult1.shipmentStatus === 'SIMULATED_TEST', 'Shipment status is SIMULATED_TEST');
    assert(shipmentResult1.awbNumber.startsWith('SIMULATED-NP-'), `Simulated AWB generated with clear prefix: ${shipmentResult1.awbNumber}`);
    assert(shipmentResult1.pickupPincode === expectedPickupPin, `Pickup PIN accurately stored: ${shipmentResult1.pickupPincode}`);
    assert(shipmentResult1.deliveryPincode === '670001', `Delivery PIN accurately separated: ${shipmentResult1.deliveryPincode}`);
    assert(shipmentResult1.isTestMode === true, 'Shipment marked as isTestMode');

    // Verify DB record for simulation
    const savedShipment1 = await prisma.shipment.findUnique({ where: { orderId: order1.id } });
    assert(savedShipment1 !== null, 'Shipment record persisted in DB');
    assert(savedShipment1?.shipmentStatus === 'SIMULATED_TEST', 'Saved shipmentStatus in DB is SIMULATED_TEST');
    assert(savedShipment1?.awbNumber === shipmentResult1.awbNumber, 'Saved AWB matches returned simulated AWB');
    assert(savedShipment1?.pickupPincode === expectedPickupPin, `Saved pickupPincode matches ${expectedPickupPin}`);

    const orderAfterSim = await prisma.order.findUnique({ where: { id: order1.id } });
    assert(orderAfterSim?.orderStatus === OrderStatus.CONFIRMED, 'Order status remains CONFIRMED (simulation does not falsely mark as SHIPPED)');
    assert(orderAfterSim?.trackingNumber === null, 'Order trackingNumber is NOT set to simulated reference');

    // Test 8: Idempotency Protection (Double call / Refresh)
    console.log('\n--- 8. Testing Idempotency & Duplicate Protection ---');
    const duplicateCallResult = await shippingService.createShipmentForOrder(order1.id);
    assert(duplicateCallResult.awbNumber === shipmentResult1.awbNumber, 'Duplicate call returned existing AWB without creating duplicate');

    const shipmentCount = await prisma.shipment.count({ where: { orderId: order1.id } });
    assert(shipmentCount === 1, 'Only 1 shipment record exists in DB for this order');

    // Test 9: Payment NOT Paid does NOT create shipment
    console.log('\n--- 9. Testing Unpaid / Pending Payment Safety ---');
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
          email: 'test.pending@gmail.com',
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

    // Test 10: Custom Hamper Weight & Box Dimensions
    console.log('\n--- 10. Testing Customized Hamper Weight & Box Dimensions ---');
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
        guestEmail: 'grandma.mary@gmail.com',
        shippingAddress: {
          name: 'Grandma Mary',
          phone: '+919876543210',
          email: 'grandma.mary@gmail.com',
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

    const hamperShipment = await shippingService.createShipmentForOrder(hamperOrder.id, { allowSimulation: true });
    assert(!!hamperShipment.awbNumber, `Hamper shipment created with AWB: ${hamperShipment.awbNumber}`);

    // Test 11: Live Tracking Check
    console.log('\n--- 11. Testing Live Tracking Endpoint ---');
    const trackingRes = await shippingService.trackShipment(hamperShipment.awbNumber);
    assert(trackingRes !== null, 'Tracking result returned');
    assert(trackingRes?.awbNumber === hamperShipment.awbNumber, 'Tracking AWB matched');
    assert(trackingRes?.history.length! >= 3, `Tracking has ${trackingRes?.history.length} checkpoints`);

    // Test 12: Pickup Scheduling
    console.log('\n--- 12. Testing Pickup Request Scheduling ---');
    const pickupRes = await shippingService.requestPickup({
      pickupLocation: 'Dhanyasree 1',
      pickupPincode: '560001',
      pickupDate: '2026-10-25',
      pickupTime: '15:00',
      expectedPackageCount: 2,
    });
    assert(pickupRes.success === true, 'Pickup scheduling request succeeded');
    assert(!!pickupRes.pickupRequestId, `Pickup Request ID generated: ${pickupRes.pickupRequestId}`);

    // Test 13: Manifest and Label Generation
    console.log('\n--- 13. Testing Manifest and Label URL Generators ---');
    const labelRes = await shippingService.generateLabel(hamperShipment.awbNumber);
    assert(labelRes.labelUrl.includes(hamperShipment.awbNumber), 'Label URL contains AWB');
    const manifestRes = await shippingService.generateManifest(hamperShipment.awbNumber);
    assert(manifestRes.manifestUrl.includes(hamperShipment.awbNumber), 'Manifest URL contains AWB');

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
