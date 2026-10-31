import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { paymentService } from '../services/payment/payment.service.js';
import { inventoryService } from '../services/inventory.service.js';
import { StripeProvider } from '../services/payment/stripe.provider.js';
import { RazorpayProvider } from '../services/payment/razorpay.provider.js';
import { PaymentStatus, OrderStatus, PaymentProvider } from '@prisma/client';
import { handleControllerError } from '../utils/dbError.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { emailService } from '../services/email.service.js';

const stripeProvider = new StripeProvider();
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
      items:
        order.items?.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })) || [],
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      currency: order.currency,
      notes: `[PAYMENT CONFIRMED: STRIPE (${order.paymentId || order.transactionId || 'VERIFIED'})] ${order.notes || shipping.personalizationNote || ''}`.trim(),
      media,
    };

    const sendResult = await whatsappService.sendOrderToBusiness(waPayload);
    if (sendResult.success) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CONFIRMED,
          title: 'WhatsApp Payment Confirmation Sent',
          description: `Confirmed Stripe payment notification automatically delivered to Business WhatsApp. Message ID: ${sendResult.messageId || 'N/A'}`,
        },
      });
    }
  } catch (waErr) {
    console.warn('[WHATSAPP_PAYMENT_NOTIFY_WARN]', waErr);
  }
}

/**
 * Public Payment Configuration (Public Stripe Publishable Key only - Secret is NEVER exposed)
 */
export async function getStripeConfig(_req: Request, res: Response) {
  const publishableKey = stripeProvider.publishableKey;
  const isLive = stripeProvider.isLiveMode;
  return res.json({
    success: true,
    data: {
      provider: 'STRIPE',
      publishableKey,
      keyId: publishableKey, // Backward compatibility for any clients reading keyId
      isLive,
      mode: isLive ? 'live' : 'test',
    },
  });
}

// Backward-compatible alias for existing frontend routes
export const getRazorpayConfig = getStripeConfig;
export const getPaymentConfig = getStripeConfig;

/**
 * 1. Create Server-Side Payment Session / PaymentIntent
 * Recalculates authoritative prices and stock securely on server before invoking Stripe API.
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

    const targetProvider =
      providerName && providerName.toUpperCase() === 'RAZORPAY' ? 'RAZORPAY' : 'STRIPE';

    console.log(
      `[STRIPE_ORDER_REQUEST] Order #${order.orderNumber}, Amount: ${order.currency} ${order.total}, Mode: ${stripeProvider.mode.toUpperCase()}`
    );

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
        clientSecret: session.clientSecret,
        publishableKey: session.publishableKey || stripeProvider.publishableKey,
        keyId: session.publishableKey || stripeProvider.publishableKey,
        providerOrderId: session.providerOrderId,
        paymentIntentId: session.providerOrderId,
        razorpayOrderId: session.providerOrderId, // Backwards compatibility
        amount: order.total,
        currency: order.currency,
        provider: session.provider,
        gatewayMode: stripeProvider.mode,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create payment session.');
  }
}

/**
 * Demo Payment Endpoint (Disabled)
 */
export async function processDemoPayment(_req: Request, res: Response) {
  return res.status(403).json({
    success: false,
    message: 'Demo payment mode has been permanently removed. All payments are processed through Stripe.',
  });
}

/**
 * 2. Server-Side Payment Verification
 */
export async function verifyPayment(req: Request, res: Response) {
  try {
    const {
      orderId,
      paymentIntentId,
      paymentId,
      razorpayPaymentId,
      providerOrderId,
      razorpayOrderId,
      signature,
      razorpaySignature,
      providerName,
    } = req.body;

    const actualPaymentId = (paymentIntentId || razorpayPaymentId || paymentId || providerOrderId || razorpayOrderId || '').trim();
    const actualOrderId = (providerOrderId || razorpayOrderId || paymentIntentId || actualPaymentId || '').trim();

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    if (!actualPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment identifier (paymentIntentId or paymentId) is required.',
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

    const targetProvider =
      providerName && providerName.toUpperCase() === 'RAZORPAY' ? 'RAZORPAY' : 'STRIPE';

    // Server-side verification via payment service
    const verification = await paymentService.verifyPayment(
      {
        orderId,
        paymentId: actualPaymentId,
        providerOrderId: actualOrderId,
        signature: razorpaySignature || signature,
      },
      targetProvider
    );

    if (!verification.success) {
      console.warn(`[PAYMENT_VERIFICATION_FAILED] Order #${order.orderNumber}, Payment ID: ${actualPaymentId}`);

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
          description: `Verification failed for transaction ${actualPaymentId}.`,
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid gateway signature or transaction not confirmed.',
      });
    }

    // Authoritative Amount Check: Verify paid amount matches internal order amount (if amount > 0 returned)
    if (verification.amount > 0 && Math.abs(verification.amount - order.total) > 1.0) {
      console.error(
        `[PAYMENT_AMOUNT_MISMATCH] Order #${order.orderNumber}: Expected ${order.total}, Received from Gateway: ${verification.amount}`
      );
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch: Expected ${order.currency} ${order.total}, but received ${verification.amount}.`,
      });
    }

    console.log(
      `[PAYMENT_VERIFICATION_SUCCESS] Order #${order.orderNumber}, Transaction: ${verification.transactionId}`
    );

    const dbProvider =
      targetProvider === 'RAZORPAY' ? PaymentProvider.RAZORPAY : PaymentProvider.STRIPE;

    // Mark order as PAID & Confirmed in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: dbProvider,
        paymentId: verification.transactionId,
        transactionId: verification.transactionId,
        shippingMethod: 'PENDING_SELECTION',
      },
    });

    // Update payment record in database with gateway response
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        provider: dbProvider,
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
        title: `Payment Confirmed via ${targetProvider === 'RAZORPAY' ? 'Razorpay' : 'Stripe'}`,
        description: `Verified ${targetProvider === 'RAZORPAY' ? 'Razorpay' : 'Stripe'} payment captured. Transaction ID: ${verification.transactionId}.`,
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

    // Trigger Customer Order Confirmation and Admin Notification Emails via MSG91
    emailService.sendCustomerOrderConfirmation(order).catch((emailErr) =>
      console.warn('[verifyPayment] Customer confirmation email dispatch warning:', emailErr.message)
    );
    emailService.sendAdminNewOrderNotification(order).catch((emailErr) =>
      console.warn('[verifyPayment] Admin notification email dispatch warning:', emailErr.message)
    );

    return res.json({
      success: true,
      message: 'Payment successfully verified and order confirmed.',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        transactionId: verification.transactionId,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: targetProvider,
        shipment: null,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Payment verification failed.');
  }
}

/**
 * 3. Stripe & Multi-Gateway Idempotent Webhook Handler
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const stripeSignature = (req.headers['stripe-signature'] as string) || '';
    const razorpaySignature = (req.headers['x-razorpay-signature'] as string) || '';

    // Handle Stripe Webhook
    if (stripeSignature || req.params.provider === 'stripe' || (!razorpaySignature && req.body?.type?.startsWith('payment_intent.'))) {
      let event: any;

      if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('placeholder')) {
        try {
          event = stripeProvider.constructWebhookEvent(rawBody, stripeSignature);
        } catch (sigErr: any) {
          console.warn('[handleWebhook] Invalid Stripe webhook signature:', sigErr.message);
          return res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
        }
      } else {
        event = req.body;
      }

      console.log(`[STRIPE_WEBHOOK_RECEIVED] Event: ${event.type}`);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        const orderId = paymentIntent.metadata?.orderId;

        let order = orderId
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : null;

        if (!order) {
          const paymentRecord = await prisma.payment.findFirst({
            where: { providerOrderId: paymentIntentId },
          });
          if (paymentRecord?.orderId) {
            order = await prisma.order.findUnique({ where: { id: paymentRecord.orderId } });
          }
        }

        if (order && order.paymentStatus !== PaymentStatus.PAID) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              orderStatus: OrderStatus.CONFIRMED,
              paymentProvider: PaymentProvider.STRIPE,
              shippingMethod: 'PENDING_SELECTION',
              paymentId: paymentIntentId,
              transactionId: paymentIntentId,
            },
          });

          await prisma.payment.updateMany({
            where: { orderId: order.id },
            data: {
              provider: PaymentProvider.STRIPE,
              status: PaymentStatus.PAID,
              providerPaymentId: paymentIntentId,
              signatureVerified: true,
              rawResponse: paymentIntent,
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
                title: 'Payment Captured via Stripe Webhook',
                description: `Payment confirmed via webhook event "${event.type}". Payment Intent ID: ${paymentIntentId}.`,
              },
            });
          } catch (tlErr) {
            console.warn('[handleWebhook] Timeline note:', tlErr);
          }

          notifyWhatsAppPaymentConfirmed(order);

          emailService.sendCustomerOrderConfirmation(order).catch((emailErr) =>
            console.warn('[handleStripeWebhook] Customer confirmation email warning:', emailErr.message)
          );
          emailService.sendAdminNewOrderNotification(order).catch((emailErr) =>
            console.warn('[handleStripeWebhook] Admin notification email warning:', emailErr.message)
          );
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        const orderId = paymentIntent.metadata?.orderId;

        const order = orderId
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : null;

        if (order && order.paymentStatus !== PaymentStatus.PAID) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: PaymentStatus.FAILED },
          });

          await prisma.payment.updateMany({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.FAILED,
              rawResponse: paymentIntent,
            },
          });

          await prisma.orderTimeline.create({
            data: {
              orderId: order.id,
              status: order.orderStatus,
              title: 'Stripe Payment Failed',
              description: `Payment intent failed at gateway: ${paymentIntent.last_payment_error?.message || 'Transaction declined'}`,
            },
          });
        }
      }

      return res.status(200).json({ received: true });
    }

    // Fallback: Legacy Razorpay Webhook
    if (razorpaySignature) {
      if (process.env.RAZORPAY_WEBHOOK_SECRET && !process.env.RAZORPAY_WEBHOOK_SECRET.includes('placeholder')) {
        const isValid = razorpayProvider.verifyWebhookSignature(rawBody, razorpaySignature);
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

              notifyWhatsAppPaymentConfirmed(order);
            }
          }
        }
      }
      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    return handleControllerError(res, error, 'Webhook processing failed.');
  }
}
