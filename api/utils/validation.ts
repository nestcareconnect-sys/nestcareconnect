/**
 * Centralized Validation Utilities for Nest Care Connect
 */

/**
 * Standard RFC 5322 compliant regex for practical email validation
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate whether a given value is a syntactically valid email address.
 * Explicitly rejects empty strings, null/undefined, whitespace-only,
 * and UPI handles (e.g. @oksbi, @okhdfcbank).
 */
export function isValidEmail(email?: any): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  if (!EMAIL_REGEX.test(trimmed)) return false;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  return true;
}

/**
 * Clean, trim, lowercase, and validate an email address.
 */
export function sanitizeAndValidateEmail(email?: any): {
  isValid: boolean;
  cleanEmail?: string;
  error?: string;
} {
  if (email === undefined || email === null) {
    return { isValid: false, error: 'Email address is required.' };
  }
  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email address must be a string.' };
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email address cannot be empty.' };
  }
  if (!isValidEmail(trimmed)) {
    // Check if user accidentally entered a UPI VPA (common in India)
    if (trimmed.includes('@ok') || trimmed.includes('@upi') || trimmed.includes('@ybl') || trimmed.includes('@axl') || trimmed.includes('@ibl')) {
      return {
        isValid: false,
        error: `Invalid email address: '${trimmed}'. This appears to be a UPI payment ID, not an email address.`,
      };
    }
    return {
      isValid: false,
      error: `Invalid email address format: '${trimmed}'. Please provide a valid email (e.g. name@example.com).`,
    };
  }

  return { isValid: true, cleanEmail: trimmed.toLowerCase() };
}

/**
 * Validates whether a phone number is provided and in valid international/national format.
 * Supports country codes (e.g. +91, +1, +44, +971, etc.).
 * Disallows alphabetic or malicious characters.
 * Requires 7 to 15 digits (ITU-T E.164 standard).
 */
export function isValidPhoneNumber(phone?: any): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;
  const validCharsRegex = /^\+?[0-9\s\-().]+$/;
  if (!validCharsRegex.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

export function validatePhoneNumber(phone?: any): {
  isValid: boolean;
  cleanPhone?: string;
  normalized?: string;
  error?: string;
} {
  if (phone === undefined || phone === null) {
    return { isValid: false, error: 'Please enter your mobile number.' };
  }
  if (typeof phone !== 'string') {
    return { isValid: false, error: 'Please enter your mobile number.' };
  }
  const trimmed = phone.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Please enter your mobile number.' };
  }

  // Check character validity: only optional leading +, digits, spaces, parentheses, hyphens, dots
  const validCharsRegex = /^\+?[0-9\s\-().]+$/;
  if (!validCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (e.g. +91  8921342411 or +1 415 555 2671).',
    };
  }

  // Count total digits
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (7 to 15 digits).',
    };
  }

  const cleanPhone = trimmed.replace(/\s+/g, ' ');
  const normalized = trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;

  return { isValid: true, cleanPhone, normalized };
}
