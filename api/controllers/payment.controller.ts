import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { paymentService } from '../services/payment/payment.service.js';
import { inventoryService } from '../services/inventory.service.js';
import { RazorpayProvider } from '../services/payment/razorpay.provider.js';
import { PaymentStatus, OrderStatus, PaymentProvider } from '@prisma/client';
import { handleControllerError } from '../utils/dbError.js';
import { whatsappService } from '../services/whatsapp.service.js';

const razorpayProvider = new RazorpayProvider();

async function notifyWhatsAppPaymentConfirmed(order: any) {
  try {
    const shipping: any = order.shippingAddress || {};
    const buyer = order.guestName
      ? {
          name: order.guestName,
          email: order.guestEmail,
          phone: order.guestPhone,
          country: order.country,
        }
      : shipping.buyer || {
          name: shipping.name,
          email: shipping.email,
          phone: shipping.phone,
          country: order.country,
        };

    const recipient = shipping.recipient || shipping;
    const media = shipping.whatsappMedia || [];

    const waPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyer,
      recipient,
      items: order.items?.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })) || [],
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      currency: order.currency,
      notes: `[PAYMENT CONFIRMED: RAZORPAY (${order.paymentId || order.transactionId || 'VERIFIED'})] ${order.notes || shipping.personalizationNote || ''}`.trim(),
      media,
    };

    const sendResult = await whatsappService.sendOrderToBusiness(waPayload);
    if (sendResult.success) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CONFIRMED,
          title: 'WhatsApp Payment Confirmation Sent',
          description: `Confirmed Razorpay payment notification automatically delivered to Business WhatsApp. Message ID: ${sendResult.messageId || 'N/A'}`,
        },
      });
    }
  } catch (waErr) {
    console.warn('[WHATSAPP_PAYMENT_NOTIFY_WARN]', waErr);
  }
}

/**
 * Public Razorpay Configuration (Public Key ID only - Secret is NEVER exposed)
 */
export async function getRazorpayConfig(_req: Request, res: Response) {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const isLive = keyId.startsWith('rzp_live_');
  return res.json({
    success: true,
    data: {
      keyId,
      isLive,
      mode: isLive ? 'live' : 'test',
    },
  });
}

/**
 * 1. Create Server-Side Razorpay Order / Payment Session
 * Recalculates authoritative prices and stock securely on server before invoking Razorpay API.
 */
export async function createPaymentSession(req: Request, res: Response) {
  try {
    const { orderId, providerName } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return res.status(400).json({ success: false, message: 'This order has already been paid and confirmed.' });
    }

    // Verify stock for all order items before initiating gateway checkout
    for (const item of order.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Product "${prod.name}" has insufficient stock (${prod.stock} remaining).`,
          });
        }
      }
    }

    const customerName =
      (order as any).buyer?.name ||
      order.user?.name ||
      order.guestName ||
      (order.shippingAddress as any)?.name ||
      'Customer';

    const customerEmail =
      (order as any).buyer?.email ||
      order.user?.email ||
      order.guestEmail ||
      'customer@nestcareconnect.com';

    const customerPhone =
      (order as any).buyer?.phone ||
      order.user?.phone ||
      order.guestPhone ||
      (order.shippingAddress as any)?.phone ||
      '';

    // Provider routing: All domestic (INR / IN) orders use official Razorpay gateway
    const targetProvider = providerName && providerName.toUpperCase() === 'STRIPE'
      ? 'STRIPE'
      : 'RAZORPAY';

    console.log(`[RAZORPAY_ORDER_REQUEST] Order #${order.orderNumber}, Amount: ${order.currency} ${order.total}, Mode: ${razorpayProvider.mode.toUpperCase()}`);

    const session = await paymentService.createPaymentSession(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        currency: order.currency,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        notes: {
          country: order.country,
          orderNumber: order.orderNumber,
        },
      },
      targetProvider
    );

    // Save or update pending payment record in DB
    try {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: session.provider as any,
          providerOrderId: session.providerOrderId,
          amount: order.total,
          currency: order.currency as any,
          status: PaymentStatus.PENDING,
          signatureVerified: false,
          rawResponse: session.metadata,
        },
      });
    } catch (pErr) {
      console.warn('[PAYMENT_RECORD_CREATE_WARN]', pErr);
    }

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: session.providerOrderId,
        providerOrderId: session.providerOrderId,
        amount: order.total,
        amountPaise: Math.round(order.total * 100),
        currency: order.currency,
        keyId: session.keyId || razorpayProvider.keyId,
        provider: session.provider,
        gatewayMode: razorpayProvider.mode,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create Razorpay payment order.');
  }
}

/**
 * Demo Payment Endpoint (Disabled)
 * Replaced by official Razorpay Live Payment Gateway.
 */
export async function processDemoPayment(_req: Request, res: Response) {
  return res.status(403).json({
    success: false,
    message: 'Demo payment mode has been permanently removed. All payments must be processed through Razorpay Live Mode.',
  });
}

/**
 * 2. Server-Side Razorpay Signature & Authoritative Amount Verification
 */
export async function verifyPayment(req: Request, res: Response) {
  try {
    const {
      orderId,
      paymentId,
      razorpayPaymentId,
      providerOrderId,
      razorpayOrderId,
      signature,
      razorpaySignature,
      providerName,
    } = req.body;

    const actualPaymentId = (razorpayPaymentId || paymentId || '').trim();
    const actualOrderId = (razorpayOrderId || providerOrderId || '').trim();
    const actualSignature = (razorpaySignature || signature || '').trim();

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    if (!actualPaymentId || !actualOrderId || !actualSignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay parameters: payment ID, order ID, and signature are all required.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in database.' });
    }

    // IDEMPOTENCY CHECK: If already marked PAID, return success without duplicate stock deduction
    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log(`[PAYMENT_VERIFICATION_IDEMPOTENT] Order #${order.orderNumber} already marked PAID.`);
      const existingShipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
      return res.json({
        success: true,
        message: 'Payment has already been verified and confirmed.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          transactionId: order.transactionId || actualPaymentId,
          paymentStatus: PaymentStatus.PAID,
          shipment: existingShipment,
        },
      });
    }

    const targetProvider = providerName && providerName.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'RAZORPAY';

    // Server-side HMAC SHA256 Signature Verification via official Razorpay provider
    const verification = await paymentService.verifyPayment(
      {
        orderId,
        paymentId: actualPaymentId,
        providerOrderId: actualOrderId,
        signature: actualSignature,
      },
      targetProvider
    );

    if (!verification.success) {
      console.warn(`[RAZORPAY_VERIFICATION_FAILED] Order #${order.orderNumber}, Payment ID: ${actualPaymentId}`);

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      await prisma.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.FAILED },
      });

      await prisma.orderTimeline.create({
        data: {
          orderId,
          status: order.orderStatus,
          title: 'Payment Verification Failed',
          description: `Cryptographic HMAC verification failed for Razorpay transaction ${actualPaymentId}.`,
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid gateway signature or transaction mismatch.',
      });
    }

    // Authoritative Amount Check: Verify paid amount matches internal order amount
    if (verification.amount > 0 && Math.abs(verification.amount - order.total) > 1.0) {
      console.error(
        `[RAZORPAY_AMOUNT_MISMATCH] Order #${order.orderNumber}: Expected ${order.total}, Received from Gateway: ${verification.amount}`
      );
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch: Expected ${order.currency} ${order.total}, but received ${verification.amount}.`,
      });
    }

    console.log(`[RAZORPAY_VERIFICATION_SUCCESS] Order #${order.orderNumber}, Transaction: ${verification.transactionId}`);

    // Mark order as PAID & Confirmed in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: PaymentProvider.RAZORPAY,
        paymentId: verification.transactionId,
        transactionId: verification.transactionId,
        shippingMethod: 'PENDING_SELECTION',
      },
    });

    // Update payment record in database with gateway response
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        provider: PaymentProvider.RAZORPAY,
        status: PaymentStatus.PAID,
        providerPaymentId: verification.transactionId,
        providerOrderId: actualOrderId,
        signatureVerified: true,
        rawResponse: verification.rawResponse,
      },
    });

    // Add Order Timeline Entry
    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.CONFIRMED,
        title: 'Payment Confirmed via Razorpay',
        description: `Verified Razorpay payment captured. Payment ID: ${verification.transactionId}, Order ID: ${actualOrderId}.`,
      },
    });

    // Deduct stock safely on server (transaction-safe)
    try {
      await inventoryService.deductOrderInventory(orderId);
    } catch (stockErr) {
      console.error('[verifyPayment] Stock deduction error:', stockErr);
    }

    // Trigger WhatsApp notification for verified payment
    notifyWhatsAppPaymentConfirmed(order);

    return res.json({
      success: true,
      message: 'Payment successfully verified and order confirmed.',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        transactionId: verification.transactionId,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: 'RAZORPAY',
        shipment: null,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Payment verification failed.');
  }
}

/**
 * 3. Razorpay Idempotent Webhook Handler
 * Supports: payment.captured, payment.failed, order.paid
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    console.log('[RAZORPAY_WEBHOOK_RECEIVED] Event received.');

    // In environments with webhook secret configured, verify cryptographic signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET && !process.env.RAZORPAY_WEBHOOK_SECRET.includes('placeholder')) {
      const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[handleWebhook] Invalid Razorpay webhook signature!');
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const paymentRecord = await prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        });

        if (paymentRecord && paymentRecord.orderId) {
          const order = await prisma.order.findUnique({ where: { id: paymentRecord.orderId } });

          // Idempotency: only process if not yet marked PAID
          if (order && order.paymentStatus !== PaymentStatus.PAID) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: PaymentStatus.PAID,
                orderStatus: OrderStatus.CONFIRMED,
                paymentProvider: PaymentProvider.RAZORPAY,
                shippingMethod: 'PENDING_SELECTION',
                paymentId: razorpayPaymentId,
                transactionId: razorpayPaymentId,
              },
            });

            await prisma.payment.updateMany({
              where: { orderId: order.id },
              data: {
                provider: PaymentProvider.RAZORPAY,
                status: PaymentStatus.PAID,
                providerPaymentId: razorpayPaymentId,
                signatureVerified: true,
                rawResponse: paymentEntity,
              },
            });

            try {
              await inventoryService.deductOrderInventory(order.id);
            } catch (stockErr) {
              console.error('[handleWebhook] Stock deduction error:', stockErr);
            }

            try {
              await prisma.orderTimeline.create({
                data: {
                  orderId: order.id,
                  status: OrderStatus.CONFIRMED,
                  title: 'Payment Captured via Razorpay Webhook',
                  description: `Payment captured via webhook event "${event}". Payment ID: ${razorpayPaymentId}.`,
                },
              });
            } catch (tlErr) {
              console.warn('[handleWebhook] Timeline note:', tlErr);
            }

            notifyWhatsAppPaymentConfirmed(order);
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDesc = paymentEntity?.error_description || paymentEntity?.error_code || 'Payment failed at gateway';

      if (razorpayOrderId) {
        const paymentRecord = await prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        });

        if (paymentRecord && paymentRecord.orderId) {
          const order = await prisma.order.findUnique({ where: { id: paymentRecord.orderId } });
          if (order && order.paymentStatus !== PaymentStatus.PAID) {
            await prisma.order.update({
              where: { id: paymentRecord.orderId },
              data: { paymentStatus: PaymentStatus.FAILED },
            });

            await prisma.payment.updateMany({
              where: { orderId: paymentRecord.orderId },
              data: {
                status: PaymentStatus.FAILED,
                rawResponse: paymentEntity,
              },
            });

            await prisma.orderTimeline.create({
              data: {
                orderId: paymentRecord.orderId,
                status: order.orderStatus,
                title: 'Razorpay Payment Failed',
                description: `Payment attempt failed: ${errorDesc}`,
              },
            });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    return handleControllerError(res, error, 'Webhook processing failed.');
  }
}
