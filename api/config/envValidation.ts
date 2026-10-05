/**
 * Startup Environment & Configuration Validator for Nest Care Connect
 */

const KNOWN_PLACEHOLDERS = [
  '12345678',
  'rzp_test_placeholder',
  'rzp_secret_placeholder',
  'rzp_test_nestcare',
  'rzp_secret_nestcare',
  'your_key_here',
  'your_razorpay_key',
  'rzp_test_actual_key_here',
  'actual_test_secret_here',
];

export function isPlaceholderKey(val?: string): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  return KNOWN_PLACEHOLDERS.some((p) => trimmed.toLowerCase().includes(p.toLowerCase()));
}

export function validateServerEnvironment(): void {
  console.log('\n========================================');
  console.log('🔍 Validating Nest Care Connect Environment');
  console.log('========================================');

  const paymentProvider = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();
  const isDemo = paymentProvider === 'demo';

  if (isDemo) {
    console.log('✅ [PAYMENT] Payment Provider: DEMO MODE (Razorpay is bypassed for testing)');
  } else {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!razorpayKeyId || isPlaceholderKey(razorpayKeyId)) {
      console.warn('⚠️  [RAZORPAY] RAZORPAY_KEY_ID is missing or configured with a placeholder value.');
      console.warn('👉 Please set RAZORPAY_KEY_ID and VITE_RAZORPAY_KEY_ID to your real Razorpay Test Key.');
    } else {
      console.log(`✅ [RAZORPAY] Key ID configured: ${razorpayKeyId.slice(0, 8)}... (${razorpayKeyId.startsWith('rzp_test_') ? 'Test Mode' : 'Live Mode'})`);
    }

    if (!razorpayKeySecret || isPlaceholderKey(razorpayKeySecret)) {
      console.warn('⚠️  [RAZORPAY] RAZORPAY_KEY_SECRET is missing or configured with a placeholder value.');
    } else {
      console.log('✅ [RAZORPAY] Key Secret is configured (server-only).');
    }

    if (razorpayWebhookSecret && !isPlaceholderKey(razorpayWebhookSecret)) {
      console.log('✅ [RAZORPAY] Webhook Secret configured.');
    }
  }

  // Shipping Provider Validation
  const shippingProvider = (process.env.SHIPPING_PROVIDER || 'nimbuspost').toLowerCase();
  const nimbusEnv = (process.env.NIMBUSPOST_ENV || 'test').toLowerCase();
  const nimbusBaseUrl = process.env.NIMBUSPOST_BASE_URL || process.env.NIMBUSPOST_API_BASE_URL || 'https://api.nimbuspost.com/v1';

  console.log(`✅ [SHIPPING] Provider: ${shippingProvider.toUpperCase()} | Environment: ${nimbusEnv.toUpperCase()} (${nimbusEnv === 'test' ? 'NIMBUSPOST TEST MODE' : 'PRODUCTION'})`);
  console.log(`📦 [SHIPPING] Base URL: ${nimbusBaseUrl}`);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.includes('placeholder')) {
    console.warn('⚠️  [AUTH] JWT_SECRET is using default value.');
  } else {
    console.log('✅ [AUTH] JWT authentication initialized.');
  }

  console.log('========================================\n');
}
