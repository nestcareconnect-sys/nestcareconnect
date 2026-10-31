import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { EmailNotificationStatus, OtpPurpose } from '@prisma/client';

export interface EmailRecipient {
  name?: string;
  email: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[] | string;
  toName?: string;
  subject: string;
  html?: string;
  htmlContent?: string;
  text?: string;
  templateId?: string;
  category?: 'OTP' | 'TRANSACTIONAL';
  variables?: Record<string, any>;
  eventType: string;
  orderId?: string;
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  status?: string;
  notificationId?: string;
  providerMessageId?: string;
  mode: 'MSG91_LIVE' | 'SIMULATED_TEST';
  error?: string;
}

export class EmailService {
  private authKey?: string;
  private apiUrl: string;
  private senderEmail: string;
  private senderName: string;
  private domain: string;
  private adminEmail: string;
  private frontendUrl: string;

  constructor() {
    this.reloadEnvConfig();
    const rawAuth = process.env.MSG91_AUTH_KEY?.trim();
    this.authKey = rawAuth && !rawAuth.includes('placeholder') ? rawAuth : undefined;
    this.apiUrl = process.env.MSG91_EMAIL_API_URL?.trim() || 'https://control.msg91.com/api/v5/email/send';
    this.senderEmail = process.env.MSG91_SENDER_EMAIL?.trim() || 'support@nestcareconnect.com';
    this.senderName = process.env.MSG91_SENDER_NAME?.trim() || 'Nest Care Connect';
    
    // Automatically derive domain from sender email if not explicitly configured
    const derivedDomain = this.senderEmail.includes('@') ? this.senderEmail.split('@')[1] : 'nestcareconnect.com';
    this.domain = process.env.MSG91_DOMAIN?.trim() || derivedDomain;

    this.adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@nestcareconnect.com';
    this.frontendUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  /**
   * Reload .env variables dynamically with override: true so on-the-fly config edits take effect immediately
   */
  public reloadEnvConfig(): void {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
      }
    } catch (_) {}
  }

  /**
   * Get current MSG91 auth key dynamically
   */
  public getAuthKey(): string | undefined {
    this.reloadEnvConfig();
    const raw = process.env.MSG91_AUTH_KEY?.trim() || this.authKey;
    return raw && !raw.includes('placeholder') ? raw : undefined;
  }

  /**
   * Get verified domain dynamically
   */
  public getDomain(): string {
    this.reloadEnvConfig();
    return process.env.MSG91_DOMAIN?.trim() || this.domain;
  }

  /**
   * Get authorized sender email aligned with domain
   */
  public getSenderEmail(): string {
    this.reloadEnvConfig();
    const raw = process.env.MSG91_SENDER_EMAIL?.trim() || this.senderEmail;
    const dom = this.getDomain();
    if (dom && !raw.endsWith(`@${dom}`) && !raw.endsWith(`.${dom}`)) {
      return `support@${dom}`;
    }
    return raw;
  }

  /**
   * Get sender display name
   */
  public getSenderName(): string {
    this.reloadEnvConfig();
    return process.env.MSG91_SENDER_NAME?.trim() || this.senderName;
  }

  /**
   * Get admin email dynamically
   */
  public getAdminEmail(): string {
    this.reloadEnvConfig();
    return process.env.ADMIN_EMAIL?.trim() || this.adminEmail;
  }

  /**
   * Get template ID dynamically from parameter, env vars, or categorized defaults
   * Distinguishes between OTP templates and Transactional templates (orders, tracking, admin)
   */
  public getTemplateId(overrideId?: string, category?: 'OTP' | 'TRANSACTIONAL'): string | undefined {
    this.reloadEnvConfig();

    if (overrideId && overrideId.trim().length > 0) {
      return overrideId.trim();
    }

    if (category === 'OTP') {
      const otpVal =
        process.env.MSG91_OTP_TEMPLATE_ID?.trim() ||
        process.env.MSG91_TEMPLATE_OTP?.trim() ||
        process.env.MSG91_TEMPLATE_VERIFY_EMAIL?.trim();
      if (otpVal) return otpVal;
    }

    if (category === 'TRANSACTIONAL') {
      const transVal =
        process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() ||
        process.env.MSG91_DEFAULT_TEMPLATE_ID?.trim() ||
        process.env.MSG91_ORDER_TEMPLATE_ID?.trim() ||
        process.env.MSG91_TEMPLATE_ORDER_CONFIRM?.trim() ||
        process.env.MSG91_TEMPLATE_ADMIN_ORDER?.trim() ||
        process.env.MSG91_TEMPLATE_SHIPMENT_TRACKING?.trim() ||
        process.env.MSG91_TEMPLATE_ORDER_STATUS?.trim();
      if (transVal) return transVal;
    }

    // Default fallbacks
    const fallback =
      (category === 'OTP'
        ? process.env.MSG91_OTP_TEMPLATE_ID?.trim()
        : (process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() || process.env.MSG91_DEFAULT_TEMPLATE_ID?.trim())) ||
      process.env.MSG91_TEMPLATE_ID?.trim() ||
      (category === 'OTP' ? 'nestcareconnect_otp' : 'nestcareconnect_transactional3');

    return fallback && fallback.length > 0 ? fallback : undefined;
  }

  /**
   * Check if live MSG91 API credentials are configured
   */
  public isLiveConfigured(): boolean {
    this.reloadEnvConfig();
    if (process.env.MSG91_SIMULATE === 'true' || process.env.MSG91_SIMULATED === 'true') {
      return false;
    }
    const key = this.getAuthKey();
    return Boolean(key && key.length > 5);
  }

  /**
   * Retrieve safe public configuration for diagnostics
   */
  public getPublicConfig() {
    return {
      provider: 'MSG91',
      isLiveConfigured: this.isLiveConfigured(),
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      domain: this.getDomain(),
      adminEmail: this.adminEmail,
      frontendUrl: this.frontendUrl,
      otpTemplateId: this.getTemplateId(undefined, 'OTP'),
      transactionalTemplateId: this.getTemplateId(undefined, 'TRANSACTIONAL'),
      templateId: this.getTemplateId(),
    };
  }

  /**
   * Primary reusable email dispatcher with audit logging, idempotency, and test simulation
   */
  public async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const rawTo = options.to as any;
    let primaryRecipient: { email: string; name?: string };
    if (typeof rawTo === 'string') {
      primaryRecipient = { email: rawTo, name: (options as any).toName };
    } else if (Array.isArray(rawTo)) {
      primaryRecipient = typeof rawTo[0] === 'string' ? { email: rawTo[0] } : rawTo[0];
    } else {
      primaryRecipient = rawTo;
    }

    if (!primaryRecipient || !primaryRecipient.email) {
      return { success: false, mode: 'SIMULATED_TEST', error: 'Recipient email is required.' };
    }

    const cleanRecipientEmail = primaryRecipient.email.toLowerCase().trim();
    const cleanRecipientName = primaryRecipient.name?.trim() || cleanRecipientEmail.split('@')[0];

    // Check idempotency for high-priority order events (prevent double sending on refresh)
    if (options.orderId && ['ADMIN_NEW_ORDER', 'CUSTOMER_ORDER_CONFIRMATION'].includes(options.eventType)) {
      const existingSuccess = await prisma.emailNotification.findFirst({
        where: {
          orderId: options.orderId,
          eventType: options.eventType,
          recipientEmail: cleanRecipientEmail,
          status: { in: [EmailNotificationStatus.ACCEPTED, EmailNotificationStatus.DELIVERED, EmailNotificationStatus.SENT] },
        },
      });

      if (existingSuccess) {
        console.log(`[EmailService] Idempotency: Skipped duplicate ${options.eventType} for order #${options.orderId}. Existing notification ID: ${existingSuccess.id}`);
        return {
          success: true,
          notificationId: existingSuccess.id,
          providerMessageId: existingSuccess.providerMessageId || undefined,
          mode: this.isLiveConfigured() ? 'MSG91_LIVE' : 'SIMULATED_TEST',
        };
      }
    }

    // 1. Create audit log entry in database with PENDING status
    let notificationRecord: any;
    try {
      notificationRecord = await prisma.emailNotification.create({
        data: {
          eventType: options.eventType,
          orderId: options.orderId || null,
          recipientEmail: cleanRecipientEmail,
          recipientName: cleanRecipientName,
          subject: options.subject,
          status: EmailNotificationStatus.PENDING,
          provider: 'MSG91',
          attempts: 1,
          lastAttemptAt: new Date(),
          metadata: {
            templateId: options.templateId,
            variables: options.variables,
            frontendUrl: this.frontendUrl,
            ...options.metadata,
          },
        },
      });
    } catch (dbErr: any) {
      console.warn('[EmailService] Failed to create email audit record in database:', dbErr.message);
    }

    // 2. Safe Test Mode when MSG91 credentials are not present or set to placeholder
    if (!this.isLiveConfigured()) {
      const simMessageId = `sim_msg91_${crypto.randomBytes(8).toString('hex')}`;
      console.log(`🌿 [EmailService:Simulated] [MSG91] Transactional email sent to ${cleanRecipientEmail} | Subject: "${options.subject}" | Notification ID: ${notificationRecord?.id || 'N/A'}`);

      if (notificationRecord) {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: EmailNotificationStatus.ACCEPTED,
            providerMessageId: simMessageId,
            sentAt: new Date(),
          },
        }).catch(() => {});
      }

      return {
        success: true,
        notificationId: notificationRecord?.id,
        providerMessageId: simMessageId,
        mode: 'SIMULATED_TEST',
      };
    }

    // 3. Live Dispatch via official MSG91 Email API v5
    let liveAuthKey: string | undefined;
    let templateId: string | undefined;
    let payload: any = null;

    try {
      liveAuthKey = this.getAuthKey();
      const senderEmail = this.getSenderEmail();
      const senderName = this.getSenderName();
      const domain = this.getDomain();
      const isOtpEvent =
        ['PASSWORD_RESET_OTP', 'EMAIL_VERIFICATION'].includes(options.eventType) ||
        options.eventType.includes('OTP');
      const derivedCategory: 'OTP' | 'TRANSACTIONAL' = options.category || (isOtpEvent ? 'OTP' : 'TRANSACTIONAL');
      templateId = this.getTemplateId(options.templateId, derivedCategory);

      payload = {
        recipients: [
          {
            to: [
              {
                name: cleanRecipientName,
                email: cleanRecipientEmail,
              },
            ],
            variables: {
              subject: options.subject,
              body: options.html || options.text || '',
              content: options.html || options.text || '',
              body_content: options.text || '',
              html_content: options.html || '',
              ...(options.variables || {}),
            },
          },
        ],
        from: {
          name: senderName,
          email: senderEmail,
        },
      };

      if (domain) {
        payload.domain = domain;
      }

      // MSG91 v5 requires a pre-created template in the MSG91 dashboard
      if (!templateId) {
        console.warn(`[EmailService] Notice: MSG91 v5 requires a 'template_id'. Please create a template in your MSG91 dashboard (under Email > Templates, with variable {{{body}}}) and set MSG91_DEFAULT_TEMPLATE_ID="your_template_id" in .env. Simulating delivery for this notification.`);
        const simId = `sim_msg91_${Date.now()}`;
        if (notificationRecord) {
          await prisma.emailNotification.update({
            where: { id: notificationRecord.id },
            data: {
              status: EmailNotificationStatus.ACCEPTED,
              providerMessageId: simId,
              sentAt: new Date(),
            },
          }).catch(() => {});
        }
        return {
          success: true,
          notificationId: notificationRecord?.id,
          providerMessageId: simId,
          mode: 'SIMULATED_TEST',
        };
      }

      payload.template_id = templateId;

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          authkey: liveAuthKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        timeout: 15000,
      });

      const providerId =
        response.data?.request_id ||
        response.data?.message_id ||
        response.data?.id ||
        response.data?.data?.[0]?.request_id ||
        `msg91_${Date.now()}`;

      if (notificationRecord) {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: EmailNotificationStatus.ACCEPTED,
            providerMessageId: String(providerId),
            sentAt: new Date(),
          },
        }).catch(() => {});
      }

      console.log(`[EmailService] MSG91 email successfully delivered for ${cleanRecipientEmail}. Provider ID: ${providerId}`);

      return {
        success: true,
        notificationId: notificationRecord?.id,
        providerMessageId: String(providerId),
        mode: 'MSG91_LIVE',
      };
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      const errorMsg = typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData);
      const errorCode = String(err.response?.status || err.code || 'API_ERROR');

      console.error(`[EmailService] MSG91 Email API delivery error to ${cleanRecipientEmail}:`, errorData);

      if (errorData?.apiError === '418' || (errorData?.errors === 'Unauthorized' && errorData?.code === '401')) {
        console.warn(`[EmailService] ⚠️ MSG91 IP Restriction Error (apiError: 418): Your current outbound public IP address is not whitelisted in your MSG91 AuthKey settings. Please add your current public IP (or subnet CIDR) under MSG91 > AuthKey > Whitelist.`);
      }

      // If transactional template version is not yet verified in MSG91, gracefully fallback to verified OTP template so email delivery never fails
      const fallbackTemplate = process.env.MSG91_OTP_TEMPLATE_ID?.trim() || (templateId !== 'nestcareconnect_otp' ? 'nestcareconnect_otp' : undefined);
      const isTemplateUnverified = errorMsg.includes('not verified') && errorMsg.includes('template_id');

      if (isTemplateUnverified && fallbackTemplate && templateId !== fallbackTemplate && liveAuthKey) {
        console.warn(`[EmailService] ⚠️ Template "${templateId}" is pending verification in MSG91 dashboard. Retrying delivery with verified fallback template "${fallbackTemplate}"...`);
        try {
          payload.template_id = fallbackTemplate;
          const retryRes = await axios.post(this.apiUrl, payload, {
            headers: {
              authkey: liveAuthKey,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            timeout: 15000,
          });

          const retryProviderId =
            retryRes.data?.request_id ||
            retryRes.data?.message_id ||
            retryRes.data?.id ||
            retryRes.data?.data?.[0]?.request_id ||
            `msg91_${Date.now()}`;

          if (notificationRecord) {
            await prisma.emailNotification.update({
              where: { id: notificationRecord.id },
              data: {
                status: EmailNotificationStatus.ACCEPTED,
                providerMessageId: String(retryProviderId),
                sentAt: new Date(),
              },
            }).catch(() => {});
          }

          console.log(`[EmailService] MSG91 email successfully delivered via fallback template for ${cleanRecipientEmail}. Provider ID: ${retryProviderId}`);

          return {
            success: true,
            notificationId: notificationRecord?.id,
            providerMessageId: String(retryProviderId),
            mode: 'MSG91_LIVE',
          };
        } catch (retryErr: any) {
          console.warn('[EmailService] Fallback template attempt also failed:', retryErr.response?.data || retryErr.message);
        }
      }

      if (notificationRecord) {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: EmailNotificationStatus.FAILED,
            errorCode,
            errorMessage: errorMsg.slice(0, 500),
          },
        }).catch(() => {});
      }

      return {
        success: false,
        notificationId: notificationRecord?.id,
        error: errorMsg,
        mode: 'MSG91_LIVE',
      };
    }
  }

  /**
   * Manually retry sending a failed or pending email notification (Admin only)
   */
  public async retryFailedEmail(notificationId: string): Promise<EmailSendResult> {
    const notification = await prisma.emailNotification.findUnique({
      where: { id: notificationId },
      include: { order: true },
    });

    if (!notification) {
      return { success: false, mode: 'SIMULATED_TEST', error: 'Email notification record not found.' };
    }

    await prisma.emailNotification.update({
      where: { id: notificationId },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    // Reconstruct options from metadata
    const meta: any = notification.metadata || {};
    const result = await this.sendEmail({
      to: { name: notification.recipientName || undefined, email: notification.recipientEmail },
      subject: notification.subject,
      eventType: notification.eventType,
      orderId: notification.orderId || undefined,
      templateId: meta.templateId,
      variables: meta.variables,
      html: meta.html,
      text: meta.text,
      metadata: { isRetry: true, originalNotificationId: notification.id },
    });

    return result;
  }

  /**
   * Webhook callback handler for MSG91 Email delivery reports
   */
  public async handleWebhookDeliveryReport(payload: any): Promise<{ handled: boolean; status?: string }> {
    try {
      const requestId = payload.requestId || payload.request_id || payload.uuid || payload.id;
      const recipient = (payload.recipient || payload.email || '').toLowerCase().trim();
      const rawStatus = (payload.status || payload.event || '').toLowerCase();

      if (!requestId && !recipient) {
        return { handled: false };
      }

      let newStatus: EmailNotificationStatus = EmailNotificationStatus.ACCEPTED;
      if (rawStatus.includes('deliver') || rawStatus === 'delivered') {
        newStatus = EmailNotificationStatus.DELIVERED;
      } else if (rawStatus.includes('fail') || rawStatus.includes('bounce') || rawStatus.includes('reject') || rawStatus.includes('error')) {
        newStatus = EmailNotificationStatus.FAILED;
      }

      const matchCondition: any = {};
      if (requestId) {
        matchCondition.providerMessageId = String(requestId);
      } else if (recipient) {
        matchCondition.recipientEmail = recipient;
      }

      const existing = await prisma.emailNotification.findFirst({
        where: matchCondition,
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        await prisma.emailNotification.update({
          where: { id: existing.id },
          data: {
            status: newStatus,
            deliveredAt: newStatus === EmailNotificationStatus.DELIVERED ? new Date() : undefined,
            errorMessage: newStatus === EmailNotificationStatus.FAILED ? (payload.description || payload.reason || 'Failed delivery reported by MSG91') : undefined,
          },
        });
        return { handled: true, status: newStatus };
      }

      return { handled: false };
    } catch (err: any) {
      console.warn('[EmailService] Webhook processing error:', err.message);
      return { handled: false };
    }
  }

  // ==========================================
  // TRANSACTIONAL WORKFLOW METHODS & TEMPLATES
  // ==========================================

  /**
   * 1. Send Password Reset OTP Email
   */
  public async sendPasswordResetOTP(
    arg1: { email: string; name?: string; otp: string; role?: string } | string,
    arg2?: string,
    arg3?: string
  ): Promise<EmailSendResult> {
    const params = typeof arg1 === 'string' ? { email: arg1, otp: arg2 || '', name: arg3 } : arg1;
    const subject = 'Password Reset Verification Code — Nest Care Connect';
    const recipientName = params.name || (params.email ? params.email.split('@')[0] : 'Customer');
    const templateId =
      process.env.MSG91_TEMPLATE_OTP?.trim() ||
      process.env.MSG91_OTP_TEMPLATE_ID?.trim() ||
      undefined;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1C6330 0%, #237A3B 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🌿 Nest Care Connect</h1>
          <p style="color: #A3E6B4; margin: 0; font-size: 13px; font-weight: 500;">Care for Loved Ones Back Home</p>
        </div>
        <div style="padding: 36px 28px; color: #1f2937;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px;">Password Reset Request</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Hello <strong>${recipientName}</strong>,<br/>
            We received a request to reset your password for your Nest Care Connect account. Use the 6-digit one-time password (OTP) below to complete your verification:
          </p>
          <div style="background: #F0FDF4; border: 2px dashed #86EFAC; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803D; font-family: monospace;">${params.otp}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; font-weight: 600;">Valid for 5 minutes only</p>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin-bottom: 16px;">
            <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or contact support immediately. Never share your OTP with anyone.
          </p>
          <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">Nest Care Connect — Dedicated Healthcare & Care Hampers for Parents in India</p>
            <p style="margin: 0;">Support: support@nestcareconnect.com | WhatsApp: +91 89213 42411</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: recipientName, email: params.email },
      subject,
      html,
      text: `Your Nest Care Connect password reset OTP is ${params.otp}. It is valid for 5 minutes.`,
      templateId,
      category: 'OTP',
      variables: {
        otp: params.otp,
        customer_name: recipientName,
        action: 'Password Reset',
        validity: '5 minutes',
      },
      eventType: 'PASSWORD_RESET_OTP',
    });
  }

  /**
   * 2. Send Email Address Verification
   */
  public async sendEmailVerification(
    arg1: { email: string; name?: string; otp: string; verificationToken?: string } | string,
    arg2?: string,
    arg3?: string
  ): Promise<EmailSendResult> {
    const params = typeof arg1 === 'string' ? { email: arg1, otp: arg2 || '', name: arg3 } : arg1;
    const subject = 'Verify Your Email Address — Nest Care Connect';
    const recipientName = params.name || (params.email ? params.email.split('@')[0] : 'Customer');
    const templateId =
      process.env.MSG91_TEMPLATE_VERIFY_EMAIL?.trim() ||
      process.env.MSG91_OTP_TEMPLATE_ID?.trim() ||
      undefined;
    const verifyUrl = `${this.frontendUrl}/verify-email?email=${encodeURIComponent(params.email || '')}&otp=${params.otp}${params.verificationToken ? `&token=${params.verificationToken}` : ''}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1C6330 0%, #237A3B 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🌿 Nest Care Connect</h1>
          <p style="color: #A3E6B4; margin: 0; font-size: 13px; font-weight: 500;">Welcome to Our Healthcare Family</p>
        </div>
        <div style="padding: 36px 28px; color: #1f2937;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px;">Confirm Your Email Address</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Hello <strong>${recipientName}</strong>,<br/>
            Thank you for joining Nest Care Connect. To protect your healthcare orders and ensure you receive order tracking updates, please verify your email address using the code below:
          </p>
          <div style="background: #F0FDF4; border: 2px dashed #86EFAC; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803D; font-family: monospace;">${params.otp}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; font-weight: 600;">Valid for 15 minutes</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyUrl}" style="background: #237A3B; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">Verify Email Automatically</a>
          </div>
          <p style="font-size: 12px; line-height: 1.6; color: #6b7280; text-align: center;">
            Or copy and paste this link in your browser: <br/>
            <a href="${verifyUrl}" style="color: #237A3B; word-break: break-all;">${verifyUrl}</a>
          </p>
          <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">Nest Care Connect — Dedicated Healthcare & Care Hampers for Parents in India</p>
            <p style="margin: 0;">Support: support@nestcareconnect.com | WhatsApp: +91 89213 42411</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: recipientName, email: params.email },
      subject,
      html,
      text: `Your Nest Care Connect email verification OTP is ${params.otp}. Or verify here: ${verifyUrl}`,
      templateId,
      category: 'OTP',
      variables: {
        otp: params.otp,
        customer_name: recipientName,
        verification_url: verifyUrl,
      },
      eventType: 'EMAIL_VERIFICATION',
    });
  }

  /**
   * 3. Send New Order Notification to Administrator
   */
  public async sendAdminNewOrderNotification(order: any): Promise<EmailSendResult> {
    const subject = `New Order Received — Nest Care Connect — ${order.orderNumber || order.id}`;
    const shipping = (order.shippingAddress as any) || {};
    const buyer = shipping.buyer || {};
    const recipient = shipping.recipient || shipping;
    const items = order.items || [];
    const templateId =
      process.env.MSG91_TEMPLATE_ADMIN_ORDER?.trim() ||
      process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() ||
      undefined;

    const itemsRows = items
      .map(
        (itm: any) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827;">${itm.name}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #4b5563; text-align: center;">${itm.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; text-align: right;">₹${Number(itm.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const fullAddress = [
      recipient.addressLine1,
      recipient.addressLine2,
      recipient.city,
      recipient.state,
      recipient.postalCode ? `PIN: ${recipient.postalCode}` : '',
      recipient.country || 'India',
    ]
      .filter(Boolean)
      .join(', ');

    const adminOrderUrl = `${this.frontendUrl}/admin/orders`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: #111827; padding: 28px 24px; text-align: left;">
          <span style="background: #237A3B; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Admin Notification</span>
          <h1 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 22px; font-weight: 800;">New Customer Order #${order.orderNumber}</h1>
          <p style="color: #9ca3af; margin: 0; font-size: 13px;">Placed on ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}</p>
        </div>
        <div style="padding: 28px 24px; color: #1f2937;">
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="background: #f9fafb; padding: 16px; border-radius: 10px; flex: 1; border: 1px solid #f3f4f6;">
              <h3 style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin: 0 0 8px 0;">Customer (Sender)</h3>
              <p style="font-size: 13px; margin: 0; font-weight: 600; color: #111827;">${buyer.name || order.guestName || 'Valued Customer'}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #4b5563;">${buyer.email || order.guestEmail || 'Not provided'}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #4b5563;">${buyer.phone || order.guestPhone || 'Not provided'}</p>
            </div>
            <div style="background: #f9fafb; padding: 16px; border-radius: 10px; flex: 1; border: 1px solid #f3f4f6;">
              <h3 style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin: 0 0 8px 0;">Recipient (In India)</h3>
              <p style="font-size: 13px; margin: 0; font-weight: 600; color: #111827;">${recipient.name || 'Recipient'}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #4b5563;">Phone: ${recipient.phone || 'Not provided'}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #4b5563;">${fullAddress}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Product / Hamper</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="background: #f9fafb; padding: 16px; border-radius: 10px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Subtotal:</span>
              <strong style="color: #111827;">₹${Number(order.subtotal || 0).toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Shipping Charges:</span>
              <strong style="color: #111827;">${order.shippingFee === 0 ? 'FREE' : `₹${Number(order.shippingFee || 0).toFixed(2)}`}</strong>
            </div>
            ${order.discount ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #15803D;">
              <span>Discount:</span>
              <strong>-₹${Number(order.discount).toFixed(2)}</strong>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <span style="font-weight: 700; color: #111827;">Total Amount:</span>
              <strong style="font-weight: 800; color: #237A3B;">₹${Number(order.total || 0).toFixed(2)} ${order.currency || 'INR'}</strong>
            </div>
            <div style="margin-top: 12px; font-size: 12px; color: #4b5563;">
              <span>Payment: <strong>${order.paymentProvider || 'STRIPE'}</strong></span> | 
              <span>Status: <strong style="color: ${order.paymentStatus === 'PAID' ? '#15803D' : '#D97706'};">${order.paymentStatus}</strong></span>
            </div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${adminOrderUrl}" style="background: #237A3B; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">Open Admin Order Panel</a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: 'Admin', email: this.getAdminEmail() },
      subject,
      html,
      text: `New order #${order.orderNumber} received for ₹${order.total}. Customer: ${buyer.name || order.guestName}.`,
      templateId,
      category: 'TRANSACTIONAL',
      variables: {
        customer_name: buyer.name || order.guestName || 'Customer',
        notification_message: `A new customer order #${order.orderNumber} has been received for ₹${Number(order.total || 0).toFixed(2)}.`,
        order_number: order.orderNumber,
        order_status: order.orderStatus || 'Confirmed',
        tracking_number: order.trackingNumber || 'Pending dispatch',
        courier_name: 'Pending assignment',
        tracking_url: adminOrderUrl,
        order_url: adminOrderUrl,
        track_url: adminOrderUrl,
        track_order_url: adminOrderUrl,
        button_url: adminOrderUrl,
        action_url: adminOrderUrl,
        url: adminOrderUrl,
        link: adminOrderUrl,
        order_id: order.orderNumber,
        total: order.total,
        payment_status: order.paymentStatus,
      },
      eventType: 'ADMIN_NEW_ORDER',
      orderId: order.id,
    });
  }

  /**
   * 4. Send Order Confirmation Email to Customer
   */
  public async sendCustomerOrderConfirmation(order: any): Promise<EmailSendResult> {
    const subject = `Order Confirmed — Nest Care Connect — ${order.orderNumber || order.id}`;
    const shipping = (order.shippingAddress as any) || {};
    const buyer = shipping.buyer || {};
    const recipient = shipping.recipient || shipping;

    let recipientEmail =
      buyer.email ||
      order.customerEmail ||
      order.user?.email ||
      order.guestEmail ||
      shipping.email ||
      shipping.recipient?.email;

    if (!recipientEmail && order.userId) {
      try {
        const u = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
        if (u?.email) recipientEmail = u.email;
      } catch (_) {}
    }

    if (!recipientEmail) {
      return { success: false, mode: 'SIMULATED_TEST', error: 'Customer email address is missing on order.' };
    }

    const customerName = buyer.name || order.guestName || (order.user?.name) || 'Valued Customer';
    const items = order.items || [];
    const templateId =
      process.env.MSG91_TEMPLATE_ORDER_CONFIRM?.trim() ||
      process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() ||
      process.env.MSG91_DEFAULT_TEMPLATE_ID?.trim() ||
      'nestcareconnect_transactional3';

    const itemsRows = items
      .map(
        (itm: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; font-weight: 500;">${itm.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #4b5563; text-align: center;">${itm.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; text-align: right; font-weight: 600;">₹${Number(itm.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const fullAddress = [
      recipient.name ? `<strong>${recipient.name}</strong>` : '',
      recipient.addressLine1,
      recipient.addressLine2,
      recipient.city,
      recipient.state,
      recipient.postalCode ? `PIN: ${recipient.postalCode}` : '',
      recipient.country || 'India',
    ]
      .filter(Boolean)
      .join('<br/>');

    const trackingUrl = `${this.frontendUrl}/orders/${order.id}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1C6330 0%, #237A3B 100%); padding: 36px 28px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">🌿 Nest Care Connect</h1>
          <p style="color: #A3E6B4; margin: 0; font-size: 14px; font-weight: 500;">Thank You for Caring for Loved Ones</p>
        </div>
        <div style="padding: 36px 28px; color: #1f2937;">
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Order Confirmation</p>
            <h2 style="font-size: 22px; font-weight: 800; color: #15803D; margin: 4px 0 0 0;">Order #${order.orderNumber}</h2>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
            Dear <strong>${customerName}</strong>,<br/>
            Your order has been confirmed! Our care specialists are preparing your package with utmost care for your loved ones in India.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Items</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Subtotal:</span>
              <strong style="color: #111827;">₹${Number(order.subtotal || 0).toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Shipping:</span>
              <strong style="color: #111827;">${order.shippingFee === 0 ? 'FREE' : `₹${Number(order.shippingFee || 0).toFixed(2)}`}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <span style="font-weight: 700; color: #111827;">Total Paid:</span>
              <strong style="font-weight: 800; color: #237A3B;">₹${Number(order.total || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
            <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin: 0 0 8px 0;">Delivery Destination (India)</h4>
            <div style="font-size: 13px; color: #374151; line-height: 1.5;">${fullAddress}</div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${trackingUrl}" style="background: #237A3B; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">View Order & Tracking</a>
          </div>

          <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">Questions? We're here 24/7 for you.</p>
            <p style="margin: 0;">Email: support@nestcareconnect.com | WhatsApp: +91 89213 42411</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: customerName, email: recipientEmail },
      subject,
      html,
      text: `Your Nest Care Connect order #${order.orderNumber} is confirmed for ₹${order.total}. Track at: ${trackingUrl}`,
      templateId,
      category: 'TRANSACTIONAL',
      variables: {
        customer_name: customerName,
        notification_message: 'Thank you for your order! We have received your order and our care specialists are preparing your care package for your loved ones in India.',
        order_number: order.orderNumber,
        order_status: order.orderStatus === 'PAID' ? 'Confirmed & Paid' : (order.orderStatus || 'Confirmed'),
        tracking_number: order.trackingNumber || order.shipment?.trackingNumber || order.shipment?.awbNumber || 'Will be shared upon dispatch',
        courier_name: order.shipment?.courierName || 'Assigned upon dispatch',
        tracking_url: trackingUrl,
        order_url: trackingUrl,
        track_url: trackingUrl,
        track_order_url: trackingUrl,
        button_url: trackingUrl,
        action_url: trackingUrl,
        url: trackingUrl,
        link: trackingUrl,
        order_id: order.orderNumber,
        total: order.total,
        status: order.orderStatus || 'Confirmed',
      },
      eventType: 'CUSTOMER_ORDER_CONFIRMATION',
      orderId: order.id,
    });
  }

  /**
   * 5. Send Order Status Update Email (Processing, Packed, Out for Delivery, Delivered, Cancelled)
   */
  public async sendOrderStatusUpdate(order: any, newStatus: string, note?: string): Promise<EmailSendResult> {
    const shipping = (order.shippingAddress as any) || {};
    const buyer = shipping.buyer || {};
    const recipientEmail = buyer.email || order.guestEmail || shipping.email;

    if (!recipientEmail) {
      return { success: false, mode: 'SIMULATED_TEST', error: 'Customer email address not found on order.' };
    }

    const customerName = buyer.name || order.guestName || 'Valued Customer';
    const statusTitles: Record<string, string> = {
      PROCESSING: 'Your Order Is Being Processed',
      PACKED: 'Your Order Has Been Carefully Packed',
      OUT_FOR_DELIVERY: 'Your Order Is Out for Delivery Today',
      DELIVERED: 'Your Order Has Been Delivered',
      CANCELLED: 'Your Order Has Been Cancelled',
      REFUNDED: 'Your Order Has Been Refunded',
    };

    const title = statusTitles[newStatus] || `Order Status Updated: ${newStatus}`;
    const subject = `${title} — Nest Care Connect — ${order.orderNumber}`;
    const templateId =
      process.env.MSG91_TEMPLATE_ORDER_STATUS?.trim() ||
      process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() ||
      process.env.MSG91_DEFAULT_TEMPLATE_ID?.trim() ||
      'nestcareconnect_transactional3';
    const viewUrl = `${this.frontendUrl}/orders/${order.id}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1C6330 0%, #237A3B 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">🌿 Nest Care Connect</h1>
          <p style="color: #A3E6B4; margin: 0; font-size: 13px;">Order #${order.orderNumber}</p>
        </div>
        <div style="padding: 36px 28px; color: #1f2937;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0;">${title}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
            Hello <strong>${customerName}</strong>,<br/>
            ${note || `The status of your healthcare order #${order.orderNumber} has been updated to <strong>${newStatus}</strong>.`}
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${viewUrl}" style="background: #237A3B; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">View Live Order Status</a>
          </div>

          <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">Nest Care Connect — Care for Loved Ones</p>
            <p style="margin: 0;">Support: support@nestcareconnect.com | WhatsApp: +91 89213 42411</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: customerName, email: recipientEmail },
      subject,
      html,
      text: `${title} for order #${order.orderNumber}. View: ${viewUrl}`,
      templateId,
      category: 'TRANSACTIONAL',
      variables: {
        customer_name: customerName,
        notification_message: note || `The status of your healthcare order #${order.orderNumber} has been updated to ${newStatus}.`,
        order_number: order.orderNumber,
        order_status: newStatus,
        tracking_number: order.trackingNumber || order.shipment?.trackingNumber || order.shipment?.awbNumber || 'Will be shared upon dispatch',
        courier_name: order.shipment?.courierName || 'Assigned upon dispatch',
        tracking_url: viewUrl,
        order_url: viewUrl,
        track_url: viewUrl,
        track_order_url: viewUrl,
        button_url: viewUrl,
        action_url: viewUrl,
        url: viewUrl,
        link: viewUrl,
        order_id: order.orderNumber,
        status: newStatus,
        status_title: title,
      },
      eventType: 'ORDER_STATUS_UPDATE',
      orderId: order.id,
      metadata: { newStatus, note },
    });
  }

  /**
   * 6. Send Shipment Tracking Email (Shipped / Tracking updated)
   */
  public async sendShipmentTrackingEmail(
    arg1: {
      order: any;
      courierName: string;
      trackingNumber: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
      isUpdate?: boolean;
    } | any,
    arg2?: {
      courierName: string;
      trackingNumber: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
      isUpdate?: boolean;
    }
  ): Promise<EmailSendResult> {
    const params = arg2 ? { order: arg1, ...arg2 } : arg1;
    const { order, courierName, trackingNumber, trackingUrl, estimatedDelivery, isUpdate } = params;
    const shipping = (order?.shippingAddress as any) || {};
    const buyer = shipping.buyer || {};
    const recipientEmail = buyer.email || order.guestEmail || shipping.email || order.user?.email;

    if (!recipientEmail) {
      return { success: false, mode: 'SIMULATED_TEST', error: 'Customer email address not found on order.' };
    }

    const customerName = buyer.name || order.guestName || order.user?.name || shipping.name || 'Valued Customer';
    const subjectPrefix = isUpdate ? 'Tracking Details Updated' : 'Your Order Has Been Shipped';
    const subject = `${subjectPrefix} — Nest Care Connect — ${order.orderNumber}`;
    const templateId =
      process.env.MSG91_TEMPLATE_SHIPMENT_TRACKING?.trim() ||
      process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID?.trim() ||
      process.env.MSG91_DEFAULT_TEMPLATE_ID?.trim() ||
      'nestcareconnect_transactional3';

    const trackBtnUrl = trackingUrl || `${this.frontendUrl}/orders/${order.id}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1C6330 0%, #237A3B 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">🌿 Nest Care Connect</h1>
          <p style="color: #A3E6B4; margin: 0; font-size: 13px;">Fast & Insured Delivery in India</p>
        </div>
        <div style="padding: 36px 28px; color: #1f2937;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px;">
            ${isUpdate ? 'Shipment Details Updated' : 'Your Care Package Is on Its Way!'}
          </h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Hello <strong>${customerName}</strong>,<br/>
            Great news! Your healthcare care package for order <strong>#${order.orderNumber}</strong> has been dispatched.
          </p>

          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">Courier Partner</span>
              <strong style="font-size: 13px; color: #111827;">${courierName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">Tracking / AWB Number</span>
              <strong style="font-size: 14px; color: #15803D; font-family: monospace;">${trackingNumber}</strong>
            </div>
            ${estimatedDelivery ? `
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #86EFAC;">
              <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">Estimated Delivery</span>
              <strong style="font-size: 13px; color: #111827;">${estimatedDelivery}</strong>
            </div>` : ''}
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${trackBtnUrl}" style="background: #237A3B; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">Track Your Package Live</a>
          </div>

          <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">Nest Care Connect — Healthcare & Care Hampers for Parents in India</p>
            <p style="margin: 0;">Support: support@nestcareconnect.com | WhatsApp: +91 89213 42411</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: { name: customerName, email: recipientEmail },
      subject,
      html,
      text: `Your order #${order.orderNumber} is shipped with ${courierName}. Tracking: ${trackingNumber}. Track here: ${trackBtnUrl}`,
      templateId,
      category: 'TRANSACTIONAL',
      variables: {
        customer_name: customerName,
        notification_message: isUpdate
          ? `Your shipment tracking details have been updated. Your care package is being delivered by ${courierName}.`
          : `Great news! Your healthcare care package has been dispatched via ${courierName} and is on its way to your loved ones in India. Track your shipment below:`,
        order_number: order.orderNumber,
        order_status: 'Shipped',
        tracking_number: trackingNumber,
        courier_name: courierName,
        courier_partner: courierName,
        tracking_url: trackBtnUrl,
        order_url: trackBtnUrl,
        track_url: trackBtnUrl,
        track_order_url: trackBtnUrl,
        button_url: trackBtnUrl,
        action_url: trackBtnUrl,
        url: trackBtnUrl,
        link: trackBtnUrl,
        order_id: order.orderNumber,
        status: 'Shipped',
        estimated_delivery: estimatedDelivery || 'Standard delivery',
      },
      eventType: isUpdate ? 'TRACKING_DETAILS_UPDATED' : 'SHIPMENT_TRACKING',
      orderId: order.id,
      metadata: { courierName, trackingNumber, trackingUrl, estimatedDelivery },
    });
  }

  /**
   * 7. Send Delivery Confirmation Email
   */
  public async sendDeliveryConfirmation(order: any): Promise<EmailSendResult> {
    return this.sendOrderStatusUpdate(order, 'DELIVERED', 'Your healthcare order has been successfully delivered to your recipient in India! Thank you for trusting Nest Care Connect to care for your loved ones.');
  }
}

export const emailService = new EmailService();
export default emailService;

