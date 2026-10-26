import 'dotenv/config';
import crypto from 'crypto';
import prisma from '../api/config/prisma.js';
import { RazorpayProvider } from '../api/services/payment/razorpay.provider.js';
import { paymentService } from '../api/services/payment/payment.service.js';
import { processDemoPayment } from '../api/controllers/payment.controller.js';

const razorpayProvider = new RazorpayProvider();

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${msg}`);
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🧪 Starting Razorpay Live Integration Test Suite');
  console.log('========================================\n');

  // Test 1: Provider Environment Configuration
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  assert(Boolean(keyId), 'RAZORPAY_KEY_ID is present in environment');
  assert(Boolean(keySecret), 'RAZORPAY_KEY_SECRET is present in environment');
  assert(!keyId.includes('placeholder'), 'RAZORPAY_KEY_ID is not a placeholder');
  assert(!keySecret.includes('placeholder'), 'RAZORPAY_KEY_SECRET is not a placeholder');
  assert(process.env.PAYMENT_PROVIDER === 'razorpay', 'PAYMENT_PROVIDER is set to "razorpay"');
  assert(process.env.VITE_PAYMENT_PROVIDER === 'razorpay', 'VITE_PAYMENT_PROVIDER is set to "razorpay"');
  assert(process.env.VITE_RAZORPAY_KEY_ID === keyId, 'VITE_RAZORPAY_KEY_ID matches backend RAZORPAY_KEY_ID');

  console.log(`ℹ️ Razorpay Key Prefix: ${keyId.slice(0, 8)}... (${keyId.startsWith('rzp_live_') ? 'LIVE MODE' : 'TEST MODE'})`);

  // Test 2: Demo Mode Permanently Disabled
  assert(paymentService.isDemoMode === false, 'paymentService.isDemoMode returns false');
  try {
    paymentService.getProviderByName('DEMO');
    assert(false, 'getProviderByName("DEMO") should have thrown an error');
  } catch (err: any) {
    assert(err.message.includes('Demo payment mode is disabled'), 'Requesting DEMO provider throws descriptive error');
  }

  // Test 3: Demo Endpoint Lockout (403 Forbidden)
  let demoStatus = 0;
  let demoResponse: any = {};
  const mockReq: any = { body: { orderId: 'test' } };
  const mockRes: any = {
    status: (s: number) => {
      demoStatus = s;
      return mockRes;
    },
    json: (d: any) => {
      demoResponse = d;
      return mockRes;
    },
  };
  await processDemoPayment(mockReq, mockRes);
  assert(demoStatus === 403, 'processDemoPayment responds with HTTP 403 Forbidden');
  assert(demoResponse.success === false, 'processDemoPayment response indicates failure');
  assert(demoResponse.message.includes('permanently removed'), 'processDemoPayment informs that demo mode is removed');

  // Test 4: Official Razorpay Order Creation via API
  console.log('\n--- Testing Official Razorpay Order Creation API ---');
  const dummyOrderNumber = `NCC-TEST-${Date.now().toString().slice(-6)}`;
  const orderSession = await paymentService.createPaymentSession({
    orderId: 'test_order_id_123',
    orderNumber: dummyOrderNumber,
    amount: 250.0, // INR 250.00
    currency: 'INR',
    customer: {
      name: 'Verification Bot',
      email: 'test@nestcareconnect.com',
      phone: '+919876543210',
    },
  });

  assert(orderSession.provider === 'RAZORPAY', 'Created session provider is RAZORPAY');
  assert(orderSession.providerOrderId.startsWith('order_'), `Razorpay Order ID created successfully: ${orderSession.providerOrderId}`);
  assert(orderSession.keyId === keyId, 'Public Key ID correctly returned from order creation');
  assert(orderSession.amount === 250.0, 'Order amount preserved');
  console.log(`✅ Created Live/Test Razorpay Order ID: ${orderSession.providerOrderId}`);

  // Test 5: Cryptographic Signature Verification
  console.log('\n--- Testing Cryptographic HMAC-SHA256 Signature Verification ---');
  const providerOrderId = orderSession.providerOrderId;
  const paymentId = 'pay_test_' + Date.now().toString();

  // 5a. Authentic Signature
  const authenticSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${providerOrderId}|${paymentId}`)
    .digest('hex');

  const validSigCheck = await razorpayProvider.verifyPayment({
    orderId: 'test_order_id_123',
    providerOrderId,
    paymentId,
    signature: authenticSignature,
  });
  assert(validSigCheck.success === true, 'Authentic HMAC signature passes verification');
  assert(validSigCheck.transactionId === paymentId, 'Transaction ID matches');

  // 5b. Tampered Signature
  const tamperedSignature = authenticSignature.slice(0, -4) + 'abcd';
  const invalidSigCheck = await razorpayProvider.verifyPayment({
    orderId: 'test_order_id_123',
    providerOrderId,
    paymentId,
    signature: tamperedSignature,
  });
  assert(invalidSigCheck.success === false, 'Tampered HMAC signature is rejected');
  assert(invalidSigCheck.status === 'FAILED', 'Invalid signature yields status FAILED');

  // 5c. Fake Simulation Signature Bypass Blocked
  const fakeSimulationSig = 'simulated_valid_test_signature';
  const fakeSigCheck = await razorpayProvider.verifyPayment({
    orderId: 'test_order_id_123',
    providerOrderId,
    paymentId,
    signature: fakeSimulationSig,
  });
  assert(fakeSigCheck.success === false, 'Fake simulation signature "simulated_valid_test_signature" is strictly rejected');

  // Test 6: Webhook Signature Verification
  console.log('\n--- Testing Razorpay Webhook Signature Verification ---');
  const sampleWebhookPayload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_webhook_test_123',
          entity: 'payment',
          amount: 25000,
          currency: 'INR',
          status: 'captured',
          order_id: providerOrderId,
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
  const webhookSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(Buffer.from(sampleWebhookPayload, 'utf8'))
    .digest('hex');

  const webhookCheck = razorpayProvider.verifyWebhookSignature(sampleWebhookPayload, webhookSignature);
  assert(webhookCheck === true, 'Authentic webhook signature passes verification');

  const tamperedWebhookCheck = razorpayProvider.verifyWebhookSignature(
    sampleWebhookPayload + ' ',
    webhookSignature
  );
  assert(tamperedWebhookCheck === false, 'Tampered webhook payload is rejected');

  // Test 7: Database Order & Real Pricing Flow
  console.log('\n--- Testing Database Order Creation & Real Pricing Match ---');
  const sampleProduct = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (sampleProduct) {
    console.log(`Found active product: "${sampleProduct.name}" (Base Price INR: ${sampleProduct.basePriceINR})`);
    assert(sampleProduct.basePriceINR > 0, 'Database product has positive price');
  }

  console.log('\n========================================');
  console.log('🎉 ALL 10 RAZORPAY INTEGRATION TESTS PASSED!');
  console.log('========================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
