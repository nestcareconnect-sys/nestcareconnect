/**
 * Startup Environment & Configuration Validator for Nest Care Connect
 */

const KNOWN_PLACEHOLDERS = [
  '12345678',
  'rzp_test_placeholder',
  'rzp_secret_placeholder',
  'rzp_test_nestcare',
  'rzp_secret_nestcare',
  'sk_test_placeholder',
  'pk_test_placeholder',
  'whsec_placeholder',
  'your_key_here',
  'your_razorpay_key',
  'your_stripe_key',
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

  const paymentProvider = (process.env.PAYMENT_PROVIDER || 'stripe').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const stripePublishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY)?.trim() || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  if (paymentProvider === 'demo') {
    console.warn('⚠️  [PAYMENT] PAYMENT_PROVIDER="demo" is permanently disabled. Enforcing Stripe Payment Gateway.');
  }

  // Stripe Validation
  if (!stripeSecretKey || isPlaceholderKey(stripeSecretKey)) {
    if (isProduction) {
      console.error('❌ [STRIPE] PRODUCTION CRITICAL: STRIPE_SECRET_KEY is missing or placeholder! Live customer transactions will fail.');
    } else {
      console.warn('⚠️  [STRIPE] STRIPE_SECRET_KEY is missing or set to a placeholder.');
      console.warn('👉 Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env.');
    }
  } else if (stripeSecretKey.startsWith('sk_live_')) {
    console.log(`✅ [STRIPE] Live Mode Active! Live Secret Key: ${stripeSecretKey.slice(0, 12)}...`);
  } else if (stripeSecretKey.startsWith('sk_test_')) {
    if (isProduction) {
      console.error('❌ [STRIPE] PRODUCTION CONFIG ERROR: Detected Test Key (sk_test_...) in production! Production requires Live credentials (sk_live_...).');
    } else {
      console.log(`ℹ️  [STRIPE] Test Mode Active: ${stripeSecretKey.slice(0, 12)}... (Development sandbox)`);
    }
  }

  if (stripePublishableKey && !isPlaceholderKey(stripePublishableKey)) {
    console.log(`✅ [STRIPE] Publishable Key configured (${stripePublishableKey.startsWith('pk_live_') ? 'Live' : 'Test'}).`);
  } else {
    console.warn('⚠️  [STRIPE] STRIPE_PUBLISHABLE_KEY is not configured or set to placeholder.');
  }

  if (stripeWebhookSecret && !isPlaceholderKey(stripeWebhookSecret)) {
    console.log('✅ [STRIPE] Webhook Secret configured for automated event processing.');
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

  // MSG91 Transactional Email Delivery Configuration Validation
  const msg91AuthKey = process.env.MSG91_AUTH_KEY?.trim();
  const msg91Sender = process.env.MSG91_SENDER_EMAIL?.trim() || 'support@nestcareconnect.com';
  if (!msg91AuthKey || isPlaceholderKey(msg91AuthKey)) {
    if (isProduction) {
      console.warn('⚠️  [MSG91] Production Notice: MSG91_AUTH_KEY is not configured or placeholder. Transactional emails will run in safe simulated test mode.');
    } else {
      console.log('ℹ️  [MSG91] MSG91_AUTH_KEY not set or placeholder. Operating in safe simulated transactional email mode.');
    }
  } else {
    console.log(`✅ [MSG91] Live Email Delivery active! Sender: ${msg91Sender}`);
  }

  console.log('========================================\n');
}
