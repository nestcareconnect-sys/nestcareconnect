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

  // Database Configuration Validation
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('❌ [DATABASE] DATABASE_URL is not defined in environment variables!');
  } else if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.warn('⚠️  [DATABASE] DATABASE_URL does not start with postgresql:// or postgres://');
  } else {
    const isPooler = dbUrl.includes('pooler');
    const hasSsl = dbUrl.includes('sslmode=');
    console.log(`✅ [DATABASE] Neon connection string configured (${isPooler ? 'Pooled PgBouncer' : 'Direct'}${hasSsl ? ', SSL enabled' : ''})`);
  }

  const paymentProvider = (process.env.PAYMENT_PROVIDER || 'razorpay').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';

  if (paymentProvider === 'demo') {
    console.warn('⚠️  [PAYMENT] PAYMENT_PROVIDER="demo" is permanently disabled. Enforcing official Razorpay Payment Gateway.');
  }

  if (!razorpayKeyId || isPlaceholderKey(razorpayKeyId)) {
    if (isProduction) {
      console.error('❌ [RAZORPAY] PRODUCTION CRITICAL: RAZORPAY_KEY_ID is missing or placeholder! Live customer transactions will fail.');
    } else {
      console.warn('⚠️  [RAZORPAY] RAZORPAY_KEY_ID is missing or set to a placeholder.');
      console.warn('👉 Please set RAZORPAY_KEY_ID and VITE_RAZORPAY_KEY_ID in .env.');
    }
  } else if (razorpayKeyId.startsWith('rzp_live_')) {
    console.log(`✅ [RAZORPAY] Live Mode Active! Live Key ID: ${razorpayKeyId.slice(0, 12)}...`);
  } else if (razorpayKeyId.startsWith('rzp_test_')) {
    if (isProduction) {
      console.error('❌ [RAZORPAY] PRODUCTION CONFIG ERROR: Detected Test Key (rzp_test_...) in production! Production requires Live credentials (rzp_live_...).');
    } else {
      console.log(`ℹ️  [RAZORPAY] Test Mode Active: ${razorpayKeyId.slice(0, 12)}... (Development sandbox)`);
    }
  }

  if (!razorpayKeySecret || isPlaceholderKey(razorpayKeySecret)) {
    if (isProduction) {
      console.error('❌ [RAZORPAY] PRODUCTION CRITICAL: RAZORPAY_KEY_SECRET is missing! Signature verification will fail.');
    } else {
      console.warn('⚠️  [RAZORPAY] RAZORPAY_KEY_SECRET is missing or set to a placeholder.');
    }
  } else {
    console.log('✅ [RAZORPAY] Key Secret configured (secure server-side storage only).');
  }

  if (razorpayWebhookSecret && !isPlaceholderKey(razorpayWebhookSecret)) {
    console.log('✅ [RAZORPAY] Webhook Secret configured for automated event processing.');
  }

  // Shipping Provider Validation (NimbusPost)
  const shippingProvider = (process.env.SHIPPING_PROVIDER || 'nimbuspost').toLowerCase();
  const nimbusEnv = (process.env.NIMBUSPOST_ENV || 'test').toLowerCase();
  const rawApiBaseUrl = process.env.NIMBUSPOST_API_BASE_URL || process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com';
  const cleanApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');
  const nimbusBaseUrl = cleanApiBaseUrl.endsWith('/v1') ? cleanApiBaseUrl : `${cleanApiBaseUrl}/v1`;

  const pickupPincode = (process.env.NIMBUSPOST_PICKUP_PINCODE || '560001').trim();
  const pickupLocation = (process.env.NIMBUSPOST_PICKUP_LOCATION || 'Dhanyasree 1').trim();
  const hasPincodeInEnv = !!process.env.NIMBUSPOST_PICKUP_PINCODE;
  const isPincodeValid = /^[1-9][0-9]{5}$/.test(pickupPincode);

  console.log(`✅ [SHIPPING] Provider: ${shippingProvider.toUpperCase()} | Environment: ${nimbusEnv.toUpperCase()} (${nimbusEnv === 'test' ? 'NIMBUSPOST TEST MODE' : 'PRODUCTION'})`);
  console.log(`📦 [SHIPPING] Base URL: ${nimbusBaseUrl}`);

  if (isPincodeValid) {
    console.log(`📍 [SHIPPING] Pickup Hub PIN: ${pickupPincode} ${hasPincodeInEnv ? '(from env: NIMBUSPOST_PICKUP_PINCODE)' : '(default fallback: 560001)'} | Hub: "${pickupLocation}"`);
  } else {
    console.warn(`⚠️  [SHIPPING] Invalid Pickup PIN code: "${pickupPincode}". Indian postal codes must be 6 digits and cannot start with 0.`);
  }

  const hasApiKey = !!process.env.NIMBUSPOST_API_KEY && !isPlaceholderKey(process.env.NIMBUSPOST_API_KEY);
  const hasLoginCredentials = !!process.env.NIMBUSPOST_EMAIL && !!process.env.NIMBUSPOST_PASSWORD;

  if (hasApiKey) {
    console.log(`🔑 [SHIPPING] NimbusPost API Key configured: ${process.env.NIMBUSPOST_API_KEY?.slice(0, 6)}... (server-side only)`);
  } else if (hasLoginCredentials) {
    console.log(`🔑 [SHIPPING] NimbusPost User Login configured: ${process.env.NIMBUSPOST_EMAIL} (server-side only)`);
  } else if (nimbusEnv === 'production') {
    console.error('❌ [SHIPPING] PRODUCTION ERROR: Neither NIMBUSPOST_API_KEY nor NIMBUSPOST_EMAIL/PASSWORD is configured for live shipments!');
  } else {
    console.log('ℹ️  [SHIPPING] Running in NimbusPost Test Mode with simulated sandbox fulfillment.');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.includes('placeholder')) {
    console.warn('⚠️  [AUTH] JWT_SECRET is using default value.');
  } else {
    console.log('✅ [AUTH] JWT authentication initialized.');
  }

  console.log('========================================\n');
}
