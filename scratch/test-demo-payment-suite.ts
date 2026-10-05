import prisma from '../api/config/prisma.js';
import { paymentService } from '../api/services/payment/payment.service.js';
import { PaymentStatus, OrderStatus, PaymentProvider } from '@prisma/client';

async function runDemoPaymentTestSuite() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE DEMO PAYMENT TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // 1. Check Provider Registration
    console.log('\n--- TEST 1: Payment Provider Registry & Config ---');
    assert(paymentService.isDemoMode === true, 'paymentService.isDemoMode returns true when PAYMENT_PROVIDER=demo');
    const demoProvider = paymentService.getProviderByName('DEMO');
    assert(demoProvider.name === 'DEMO', 'Demo provider registered with name DEMO');
    const defaultProvider = paymentService.getProviderForCountry('IN');
    assert(defaultProvider.name === 'DEMO', 'getProviderForCountry(IN) returns DEMO when PAYMENT_PROVIDER=demo');

    // 2. Test Session Creation
    console.log('\n--- TEST 2: Demo Session Order Creation ---');
    const sessionRes = await paymentService.createPaymentSession({
      orderId: 'test-ord-123',
      orderNumber: 'NCC-TEST-001',
      amount: 4299,
      currency: 'INR',
      customer: {
        name: 'Test Sender',
        email: 'test@nestcareconnect.com',
      },
      notes: { country: 'IN' },
    });
    assert(sessionRes.provider === 'DEMO', 'Payment session provider is DEMO');
    assert(sessionRes.providerOrderId.startsWith('demo_ord_'), 'providerOrderId starts with demo_ord_ (no fake Razorpay ID)');
    assert(sessionRes.amount === 4299, 'Session amount is correct: 4299');

    // 3. Test Direct API Endpoints: Create an actual DB Order and test SUCCESS flow
    console.log('\n--- TEST 3: Database Order Demo SUCCESS Flow ---');
    const testProduct = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });
    const initialStock = testProduct?.stock || 0;

    const dbOrder = await prisma.order.create({
      data: {
        orderNumber: `NCC-TEST-${Date.now()}`,
        guestName: 'Rajesh Test',
        guestEmail: 'rajesh@test.com',
        country: 'IN',
        currency: 'INR',
        subtotal: 3500,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        total: 3500,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: PaymentProvider.DEMO,
        shippingAddress: {
          name: 'Mum & Dad',
          phone: '+91 9876543210',
          addressLine1: 'Flat 102, Palm View',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
        },
        items: testProduct
          ? {
              create: [
                {
                  itemType: 'PRODUCT',
                  productId: testProduct.id,
                  name: testProduct.name,
                  unitPrice: testProduct.basePriceINR,
                  quantity: 1,
                  totalPrice: testProduct.basePriceINR,
                  snapshot: { productName: testProduct.name },
                },
              ],
            }
          : undefined,
      },
      include: { items: true },
    });

    assert(dbOrder.paymentProvider === 'DEMO', 'Order created with paymentProvider: DEMO');
    assert(dbOrder.paymentStatus === 'PENDING', 'Order initialized with paymentStatus: PENDING');

    // Simulate backend processDemoPayment SUCCESS via API fetch
    const successRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: dbOrder.id, action: 'SUCCESS' }),
    });
    const successData = await successRes.json();
    assert(successRes.ok && successData.success === true, 'POST /api/payments/demo/process returned success');
    assert(successData.data.transactionId?.startsWith('demo_pay_'), 'Transaction ID format: demo_pay_...');

    const updatedOrder = await prisma.order.findUnique({
      where: { id: dbOrder.id },
      include: { payments: true, timeline: true, shipment: true },
    });
    assert(updatedOrder?.paymentStatus === PaymentStatus.PAID, 'Order marked PAID in database');
    assert(updatedOrder?.orderStatus === OrderStatus.CONFIRMED || updatedOrder?.orderStatus === OrderStatus.SHIPPED, 'Order status updated appropriately');
    assert(updatedOrder?.payments.length! > 0, 'Payment record created in database');
    assert(updatedOrder?.payments[0].provider === 'DEMO', 'Payment table provider is DEMO');
    assert(updatedOrder?.payments[0].status === PaymentStatus.PAID, 'Payment table status is PAID');
    assert(updatedOrder?.payments[0].providerPaymentId?.startsWith('demo_pay_') === true, 'Payment table providerPaymentId is demo_pay_...');

    // 4. Test Idempotency & Prevent Double Payment
    console.log('\n--- TEST 4: Idempotency & Duplicate Request Protection ---');
    const secondSuccessRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: dbOrder.id, action: 'SUCCESS' }),
    });
    const secondData = await secondSuccessRes.json();
    assert(secondData.success === true, 'Second call returns idempotent success');
    assert(secondData.data.paymentStatus === 'PAID', 'Status remains PAID without error');

    // 5. Test FAILED Flow and Retry
    console.log('\n--- TEST 5: Demo FAILED Flow & Retry to Success ---');
    const failedOrder = await prisma.order.create({
      data: {
        orderNumber: `NCC-FAIL-${Date.now()}`,
        guestName: 'Fail Test User',
        guestEmail: 'fail@test.com',
        country: 'IN',
        currency: 'INR',
        subtotal: 2000,
        total: 2000,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: PaymentProvider.DEMO,
        shippingAddress: { name: 'Recipient', city: 'Kochi', postalCode: '682001' },
      },
    });

    const failRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: failedOrder.id, action: 'FAILED' }),
    });
    const failData = await failRes.json();
    assert(failData.success === false, 'Simulate FAILED returned success: false');
    assert(failData.message === 'Payment failed. No money was charged.', 'Returns message: Payment failed. No money was charged.');

    const checkFailedDb = await prisma.order.findUnique({ where: { id: failedOrder.id } });
    assert(checkFailedDb?.paymentStatus === PaymentStatus.FAILED, 'Order paymentStatus in DB is FAILED');

    // Retry the failed order to SUCCESS
    const retryRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: failedOrder.id, action: 'SUCCESS' }),
    });
    const retryData = await retryRes.json();
    assert(retryData.success === true, 'Retry for failed order succeeded');
    const checkRetriedDb = await prisma.order.findUnique({ where: { id: failedOrder.id } });
    assert(checkRetriedDb?.paymentStatus === PaymentStatus.PAID, 'Retried order is now marked PAID in DB');

    // 6. Test PENDING Flow
    console.log('\n--- TEST 6: Demo PENDING Flow ---');
    const pendingOrder = await prisma.order.create({
      data: {
        orderNumber: `NCC-PEND-${Date.now()}`,
        guestName: 'Pending Test User',
        guestEmail: 'pending@test.com',
        country: 'IN',
        currency: 'INR',
        subtotal: 1500,
        total: 1500,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: PaymentProvider.DEMO,
        shippingAddress: { name: 'Recipient', city: 'Trivandrum', postalCode: '695001' },
      },
    });

    const pendRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: pendingOrder.id, action: 'PENDING' }),
    });
    const pendData = await pendRes.json();
    assert(pendData.success === true && pendData.isPending === true, 'Simulate PENDING returned isPending: true');
    const checkPendDb = await prisma.order.findUnique({ where: { id: pendingOrder.id } });
    assert(checkPendDb?.paymentStatus === PaymentStatus.PENDING, 'Order remains PENDING in DB');

    // 7. Test Predefined Hamper + Customer Photos Personalization
    console.log('\n--- TEST 7: Hamper + Customer Photo Personalization Integrity ---');
    const hamper = await prisma.hamper.findFirst({ where: { status: 'ACTIVE' } });
    const hamperOrder = await prisma.order.create({
      data: {
        orderNumber: `NCC-PHOTO-${Date.now()}`,
        guestName: 'Personalized Test Buyer',
        guestEmail: 'photo@test.com',
        country: 'US',
        currency: 'USD',
        subtotal: 59,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        total: 59,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: PaymentProvider.DEMO,
        shippingAddress: {
          name: 'Grandma Mary',
          city: 'Mumbai',
          postalCode: '400001',
          personalizationNote: 'With all our love across the miles!',
          uploadedPhotos: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'],
        },
        items: hamper
          ? {
              create: [
                {
                  itemType: 'HAMPER',
                  hamperId: hamper.id,
                  name: hamper.name,
                  unitPrice: 59,
                  quantity: 1,
                  totalPrice: 59,
                  snapshot: {
                    personalization: {
                      customMessage: 'Happy Anniversary!',
                      photos: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'],
                    },
                  },
                },
              ],
            }
          : undefined,
      },
      include: { items: true },
    });

    const photoPayRes = await fetch('http://localhost:5000/api/payments/demo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: hamperOrder.id, action: 'SUCCESS' }),
    });
    const photoPayData = await photoPayRes.json();
    assert(photoPayData.success === true, 'Demo payment succeeded for photo-personalized hamper');

    const confirmedHamperOrder = await prisma.order.findUnique({
      where: { id: hamperOrder.id },
      include: { items: true },
    });
    assert(confirmedHamperOrder?.paymentStatus === PaymentStatus.PAID, 'Personalized order confirmed as PAID');
    const snap: any = confirmedHamperOrder?.items[0]?.snapshot;
    assert(snap?.personalization?.photos?.length > 0, 'Personalization photos remained attached to order');

    // Cleanup test records
    await prisma.order.deleteMany({
      where: {
        id: { in: [dbOrder.id, failedOrder.id, pendingOrder.id, hamperOrder.id] },
      },
    });

    console.log('\n=============================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('Test execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runDemoPaymentTestSuite();
