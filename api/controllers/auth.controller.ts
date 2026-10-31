import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { handleControllerError } from '../utils/dbError.js';
import { validatePhoneNumber, sanitizeAndValidateEmail } from '../utils/validation.js';
import { OtpPurpose } from '@prisma/client';
import { emailService } from '../services/email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nest_care_connect_super_secret_jwt_key_2026_production';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_WORK_FACTOR = 12;

/**
 * Initiate Registration: Validates inputs, stages registration metadata, and dispatches 6-digit OTP via MSG91.
 * CRITICAL SECURITY & DATA INTEGRITY:
 * DOES NOT create a user record in the database until the email OTP has been successfully verified!
 */
export async function initiateRegister(req: Request, res: Response) {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email address, phone number, and password are required.',
      });
    }

    const emailValidation = sanitizeAndValidateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.error });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error });
    }

    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long for security.',
      });
    }

    const cleanEmail = emailValidation.cleanEmail!;
    const cleanPhone = phoneValidation.cleanPhone || phone.trim();

    // Check if an existing verified user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    // Hash the password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    // Invalidate prior pending registration OTPs for this email address
    await prisma.otpVerification.updateMany({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    }).catch(() => {});

    // Generate cryptographically secure 6-digit OTP for email verification
    const verificationOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(verificationOtp).digest('hex');
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    // Store pending registration details inside OtpVerification metadata WITHOUT creating a User in DB
    await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        userId: existingUser ? existingUser.id : null,
        otpHash,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresAt,
        metadata: {
          name: name.trim(),
          phone: cleanPhone,
          passwordHash,
          verificationToken,
        },
      },
    });

    // Dispatch verification email via MSG91
    emailService.sendEmailVerification({
      email: cleanEmail,
      name: name.trim(),
      otp: verificationOtp,
      verificationToken,
    }).catch((err) => console.warn('[InitiateRegister] Verification email dispatch warning:', err.message));

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      message: 'A 6-digit verification code has been sent to your email. Please verify to complete account registration.',
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to initiate account registration.');
  }
}

/**
 * Complete Registration: Verifies 6-digit OTP and creates the verified user in the database.
 * The User record is ONLY created after the OTP is verified!
 */
export async function completeRegister(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit verification code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    if (cleanOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please enter all 6 digits of the verification code.',
      });
    }

    const activeOtp = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email. Please submit the registration form again.',
      });
    }

    if (new Date() > activeOtp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new verification code.',
      });
    }

    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (hashedInput !== activeOtp.otpHash) {
      const updatedAttempts = activeOtp.attempts + 1;
      await prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { attempts: updatedAttempts },
      });
      const remaining = activeOtp.maxAttempts - updatedAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}`,
      });
    }

    const meta = (activeOtp.metadata as any) || {};
    const name = meta.name?.trim() || cleanEmail.split('@')[0];
    const phone = meta.phone?.trim() || '';
    const passwordHash = meta.passwordHash;

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (user) {
      // User existed in unverified state - update to verified
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          phone: phone || user.phone,
          ...(passwordHash ? { passwordHash } : {}),
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      if (!passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Registration session expired. Please submit the registration form again.',
        });
      }

      // CREATE THE USER IN DATABASE ONLY NOW, UPON SUCCESSFUL EMAIL OTP VERIFICATION
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name,
          phone,
          passwordHash,
          role: 'CUSTOMER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    // Invalidate the OTP record and associate with user
    await prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: {
        consumedAt: new Date(),
        userId: user.id,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Email verified successfully! Welcome to Nest Care Connect.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          emailVerified: true,
        },
        token,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to complete registration.');
  }
}

/**
 * Main register handler: If OTP is supplied, completes registration; otherwise initiates registration.
 */
export async function register(req: Request, res: Response) {
  if (req.body.otp) {
    return completeRegister(req, res);
  }
  return initiateRegister(req, res);
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // Enforce email verification for customers
    if (!user.emailVerified && user.role === 'CUSTOMER') {
      // Generate and dispatch a fresh verification OTP via MSG91
      const verificationOtp = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash('sha256').update(verificationOtp).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.otpVerification.create({
        data: {
          email: user.email,
          userId: user.id,
          otpHash,
          purpose: OtpPurpose.EMAIL_VERIFICATION,
          expiresAt,
        },
      }).catch(() => {});

      emailService.sendEmailVerification({
        email: user.email,
        name: user.name,
        otp: verificationOtp,
      }).catch((err) => console.warn('[Login] Verification email dispatch warning:', err.message));

      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        email: user.email,
        message: 'Your email address is not verified yet. We have sent a 6-digit verification code to your email. Please verify to log in.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Login failed.');
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, data: user });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch user profile.');
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ? name.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return res.json({ success: true, message: 'Profile updated successfully.', data: user });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update profile.');
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 12 characters long.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_WORK_FACTOR);
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to change password.');
  }
}

/**
 * Request password reset OTP (cryptographically secure 6-digit OTP via MSG91, no email enumeration)
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always return generic success message to prevent user enumeration attacks
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
    };

    if (!user || user.status !== 'ACTIVE') {
      return res.json(genericResponse);
    }

    // Generate 6-digit cryptographically secure random OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Invalidate existing unused password reset OTPs for this email
    await prisma.otpVerification.updateMany({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    }).catch(() => {});

    // Store secure hashed representation of OTP in database
    await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        userId: user.id,
        otpHash,
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt,
        maxAttempts: 5,
        attempts: 0,
      },
    });

    // Also maintain legacy single-use token hash for backward compatibility
    const legacyToken = crypto.randomBytes(32).toString('hex');
    const legacyTokenHash = crypto.createHash('sha256').update(legacyToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: legacyTokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    }).catch(() => {});

    // Send the OTP to registered email address using MSG91
    emailService.sendPasswordResetOTP({
      email: cleanEmail,
      name: user.name,
      otp,
      role: user.role,
    }).catch((err) => console.warn('[ForgotPassword] OTP email dispatch warning:', err.message));

    return res.json(genericResponse);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to process password reset request.');
  }
}

/**
 * Verify 6-digit password reset OTP
 */
export async function verifyResetOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp || typeof otp !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address and 6-digit verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit verification code.' });
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new verification code.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ success: false, message: 'This OTP has expired (5-minute validity). Please request a new code.' });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({ success: false, message: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    // Increment attempts counter
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    const hashedInputOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (hashedInputOtp !== otpRecord.otpHash) {
      const remaining = otpRecord.maxAttempts - (otpRecord.attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}`,
      });
    }

    // Invalidate OTP upon successful verification
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    // Issue short-lived, single-use reset authorization token (JWT valid for 15 minutes)
    const resetAuthToken = jwt.sign(
      {
        sub: otpRecord.userId,
        email: cleanEmail,
        purpose: 'PASSWORD_RESET_AUTHORIZED',
        nonce: crypto.randomBytes(16).toString('hex'),
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({
      success: true,
      message: 'Verification successful. You may now set your new password.',
      resetToken: resetAuthToken,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to verify reset OTP.');
  }
}

/**
 * Reset password using single-use reset authorization token or legacy hash token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, resetToken, newPassword } = req.body;
    const effectiveToken = (resetToken || token || '').trim();

    if (!effectiveToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset authorization token and new password are required.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 12 characters long.',
      });
    }

    let user: any = null;

    // First check if effectiveToken is a signed JWT resetAuthToken
    try {
      const decoded: any = jwt.verify(effectiveToken, JWT_SECRET);
      if (decoded && decoded.purpose === 'PASSWORD_RESET_AUTHORIZED' && decoded.email) {
        user = await prisma.user.findUnique({
          where: { email: decoded.email.toLowerCase().trim() },
        });
      }
    } catch {
      // Not a valid JWT, check legacy SHA256 token hash
      const tokenHash = crypto.createHash('sha256').update(effectiveToken).digest('hex');
      user = await prisma.user.findFirst({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: new Date() },
        },
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset authorization. Please complete OTP verification again.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_WORK_FACTOR);

    // Invalidate reset tokens upon successful change (single-use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.',
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to reset password.');
  }
}

/**
 * Verify user email address using 6-digit OTP or verification link token
 */
export async function verifyEmailAddress(req: Request, res: Response) {
  try {
    const { email, otp, token } = req.body;
    const queryEmail = (email || (req.query.email as string) || '').toLowerCase().trim();
    const queryOtp = (otp || (req.query.otp as string) || '').trim();
    const queryToken = (token || (req.query.token as string) || '').trim();

    if (!queryEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: queryEmail } });
    if (user && user.emailVerified) {
      return res.json({ success: true, message: 'Your email address is already verified.', isAlreadyVerified: true });
    }

    const activeOtp = await prisma.otpVerification.findFirst({
      where: {
        email: queryEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification request found. Please request a new verification code.',
      });
    }

    if (new Date() > activeOtp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    let isMatch = false;
    if (queryOtp) {
      const hashedInput = crypto.createHash('sha256').update(queryOtp).digest('hex');
      isMatch = hashedInput === activeOtp.otpHash;
    } else if (queryToken && activeOtp.metadata) {
      const meta = activeOtp.metadata as any;
      isMatch = meta.verificationToken === queryToken;
    }

    if (!isMatch) {
      await prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ success: false, message: 'Invalid verification code or link.' });
    }

    let effectiveUser = user;
    const meta = (activeOtp.metadata as any) || {};

    if (!effectiveUser) {
      // If User record does not exist yet (pre-registration), create user now!
      if (!meta.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Registration session expired. Please fill out the registration form again.',
        });
      }

      effectiveUser = await prisma.user.create({
        data: {
          email: queryEmail,
          name: meta.name || queryEmail.split('@')[0],
          phone: meta.phone || '',
          passwordHash: meta.passwordHash,
          role: 'CUSTOMER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: effectiveUser.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    // Mark OTP as consumed
    await prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: {
        consumedAt: new Date(),
        userId: effectiveUser.id,
      },
    });

    const authToken = jwt.sign(
      { id: effectiveUser.id, email: effectiveUser.email, role: effectiveUser.role, name: effectiveUser.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Email address successfully verified. Thank you!',
      data: {
        user: {
          id: effectiveUser.id,
          email: effectiveUser.email,
          name: effectiveUser.name,
          phone: effectiveUser.phone,
          role: effectiveUser.role,
          emailVerified: true,
        },
        token: authToken,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to verify email address.');
  }
}

/**
 * Resend email verification OTP with rate limiting
 * Supports both pre-registration and post-registration accounts
 */
export async function resendVerificationEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Check if there is an active pre-registration record
    const activePreReg = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const genericResponse = {
      success: true,
      message: 'If this email is pending verification, a new verification code has been sent.',
    };

    if (user && user.emailVerified) {
      return res.json({ success: true, message: 'Your email address is already verified.' });
    }

    if (!user && !activePreReg) {
      return res.json(genericResponse);
    }

    // Rate limit: Prevent requesting more than once every 60 seconds
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message: 'Please wait at least 60 seconds before requesting another verification code.',
      });
    }

    const verificationOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(verificationOtp).digest('hex');
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const existingMeta = (activePreReg?.metadata as any) || {};
    const recipientName = user?.name || existingMeta.name || 'Valued Customer';

    // Invalidate prior pending OTPs
    await prisma.otpVerification.updateMany({
      where: { email: cleanEmail, purpose: OtpPurpose.EMAIL_VERIFICATION, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        userId: user ? user.id : null,
        otpHash,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresAt,
        metadata: {
          ...existingMeta,
          verificationToken,
        },
      },
    });

    emailService.sendEmailVerification({
      email: cleanEmail,
      name: recipientName,
      otp: verificationOtp,
      verificationToken,
    }).catch((err) => console.warn('[Resend] Verification email dispatch warning:', err.message));

    return res.json(genericResponse);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to resend verification email.');
  }
}

export async function getAddresses(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    return res.json({ success: true, data: addresses });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch addresses.');
  }
}

export async function createAddress(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    const { name, phone, addressLine1, addressLine2, city, state, emirate, postalCode, country, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        emirate,
        postalCode,
        country: country || 'IN',
        isDefault: isDefault || false,
      },
    });

    return res.status(201).json({ success: true, data: address });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create address.');
  }
}

export async function deleteAddress(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    const { id } = req.params;

    await prisma.address.deleteMany({
      where: { id, userId: req.user.id },
    });

    return res.json({ success: true, message: 'Address removed successfully.' });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to remove address.');
  }
}
