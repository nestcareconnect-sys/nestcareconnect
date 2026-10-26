import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { handleControllerError } from '../utils/dbError.js';
import { validatePhoneNumber, sanitizeAndValidateEmail } from '../utils/validation.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nest_care_connect_super_secret_jwt_key_2026_production';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_WORK_FACTOR = 12;

export async function register(req: Request, res: Response) {
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

    const existingUser = await prisma.user.findUnique({
      where: { email: emailValidation.cleanEmail },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const user = await prisma.user.create({
      data: {
        email: emailValidation.cleanEmail!,
        name: name.trim(),
        phone: phoneValidation.cleanPhone || phone.trim(),
        passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: { user, token },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Registration failed.');
  }
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
 * Request password reset (cryptographically secure, hashed token, no email enumeration)
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always return success message to prevent user enumeration attacks
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been generated.',
    };

    if (!user || user.status !== 'ACTIVE') {
      return res.json(genericResponse);
    }

    // Generate 32-byte cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    return res.json(genericResponse);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to process password reset request.');
  }
}

/**
 * Reset password using single-use hashed token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 12 characters long.',
      });
    }

    // Verify token hash
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_WORK_FACTOR);

    // Invalidate reset token upon successful change (single-use)
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
