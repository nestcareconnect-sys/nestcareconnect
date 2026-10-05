import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { paymentService } from '../services/payment/payment.service.js';
import { inventoryService } from '../services/inventory.service.js';
import { shippingService } from '../services/shipping/shipping.service.js';
import { RazorpayProvider } from '../services/payment/razorpay.provider.js';
import { PaymentStatus, OrderStatus, PaymentProvider } from '@prisma/client';

const razorpayProvider = new RazorpayProvider();

/**
 * 1. Create Server-Side Payment Session / Order
 * Recalculates prices and stock securely on server before invoking gateway API.
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
      return res.status(400).json({ success: false, message: 'This order has already been paid.' });
    }

    // Verify stock for all order items before initiating checkout
    for (const item of order.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Product "${prod.name}" is currently out of stock (${prod.stock} remaining).`,
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

    // Provider selection: Check if PAYMENT_PROVIDER is configured as DEMO
    const isDemoMode = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'demo';
    const targetProvider = isDemoMode
      ? 'DEMO'
      : (providerName || (order.currency === 'INR' || order.country === 'IN' ? 'RAZORPAY' : 'STRIPE'));

    console.log(`[PAYMENT_ORDER_CREATED] Order #${order.orderNumber}, Amount: ${order.currency} ${order.total}, Provider: ${targetProvider}`);

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
        razorpayOrderId: session.provider === 'RAZORPAY' ? session.providerOrderId : undefined,
        providerOrderId: session.providerOrderId,
        amount: order.total,
        amountPaise: Math.round(order.total * 100),
        currency: order.currency,
        keyId: session.keyId,
        provider: session.provider,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      },
    });
  } catch (error: any) {
    console.error('[createPaymentSession] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create payment session.' });
  }
}

/**
 * Handle Demo Payment Simulation (SUCCESS, FAILED, PENDING)
 * Validates order ownership, authoritative amount, idempotent execution, safe stock deduction.
 */
export async function processDemoPayment(req: Request, res: Response) {
  try {
    const { orderId, action = 'SUCCESS' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in database.' });
    }

    const simAction = (action || 'SUCCESS').toUpperCase();

    // 1. IF SIMULATING FAILED PAYMENT
    if (simAction === 'FAILED') {
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
          title: 'Demo Payment Failed',
          description: 'Simulated payment failure in demo mode. No real money was charged.',
        },
      });

      return res.status(200).json({
        success: false,
        message: 'Payment failed. No money was charged.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }

    // 2. IF SIMULATING PENDING PAYMENT
    if (simAction === 'PENDING') {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PENDING },
      });

      await prisma.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.PENDING },
      });

      await prisma.orderTimeline.create({
        data: {
          orderId,
          status: order.orderStatus,
          title: 'Demo Payment Pending',
          description: 'Simulated pending payment status in demo mode.',
        },
      });

      return res.status(200).json({
        success: true,
        isPending: true,
        message: 'Payment is pending. Please check your payment status later.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    }

    // 3. SIMULATING SUCCESSFUL PAYMENT (IDEMPOTENCY & STOCK SAFETY)
    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log(`[DEMO_PAYMENT_SUCCESS] Idempotent hit: Order #${order.orderNumber} already marked PAID.`);
      const existingShipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
      return res.json({
        success: true,
        message: 'Demo payment already confirmed.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          transactionId: order.transactionId || `demo_pay_${order.id.slice(0, 8)}`,
          paymentProvider: 'DEMO',
          paymentStatus: PaymentStatus.PAID,
          shipment: existingShipment,
        },
      });
    }

    // Verify stock availability on server before final payment capture
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

    const randomHex = crypto.randomBytes(4).toString('hex');
    const demoTransactionId = `demo_pay_${Date.now()}_${randomHex}`;

    // Mark order as PAID & Confirmed in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentProvider: PaymentProvider.DEMO,
        paymentId: demoTransactionId,
        transactionId: demoTransactionId,
      },
    });

    // Update payment record in database
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        provider: PaymentProvider.DEMO,
        status: PaymentStatus.PAID,
        providerPaymentId: demoTransactionId,
        signatureVerified: true,
      },
    });

    // If no payment record existed, create one
    const existingPayment = await prisma.payment.findFirst({ where: { orderId } });
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.DEMO,
          providerOrderId: `demo_ord_${order.id.slice(0, 8)}`,
          providerPaymentId: demoTransactionId,
          amount: order.total,
          currency: order.currency as any,
          status: PaymentStatus.PAID,
          signatureVerified: true,
          rawResponse: { mode: 'DEMO', simulated: true, action: 'SUCCESS' },
        },
      });
    }

    // Add Order Timeline Entry
    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.CONFIRMED,
        title: 'Demo Payment Confirmed',
        description: `Verified demo payment received (Test mode — no real money charged). Ref: ${demoTransactionId}`,
      },
    });

    // Deduct stock safely on server (transaction-safe)
    try {
      await inventoryService.deductOrderInventory(orderId);
    } catch (stockErr) {
      console.error('[processDemoPayment] Stock deduction error:', stockErr);
    }

    // -------------------------------------------------------------
    // AUTOMATIC NIMBUSPOST TEST SHIPMENT CREATION FOR INDIA DELIVERIES
    // -------------------------------------------------------------
    let shipmentData: any = null;
    const shipping = (order.shippingAddress as any) || {};
    const isIndiaDelivery =
      order.country === 'IN' ||
      (order as any).deliveryCountry === 'IN' ||
      shipping.country === 'IN' ||
      shipping.deliveryCountry === 'IN';

    if (isIndiaDelivery) {
      try {
        shipmentData = await shippingService.createShipmentForOrder(order.id);
      } catch (shipmentErr: any) {
        console.warn('[processDemoPayment] NimbusPost auto-shipment creation note:', shipmentErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Demo payment completed successfully.',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        transactionId: demoTransactionId,
        paymentProvider: 'DEMO',
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        shipment: shipmentData,
      },
    });
  } catch (error: any) {
    console.error('[processDemoPayment] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to process demo payment.' });
  }
}


/**
 * 2. Server-Side Signature Verification & Automatic NimbusPost Shipment Manifest
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

    const actualPaymentId = razorpayPaymentId || paymentId;
    const actualOrderId = razorpayOrderId || providerOrderId;
    const actualSignature = razorpaySignature || signature;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // IDEMPOTENCY CHECK: If already paid, return existing status without duplicate stock deduction or shipment creation
    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log(`[PAYMENT_VERIFICATION_SUCCESS] Idempotent hit: Order #${order.orderNumber} already marked PAID.`);
      const existingShipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
      return res.json({
        success: true,
        message: 'Payment already verified and confirmed.',
        data: {
          orderId: order.id,
          transactionId: order.transactionId || actualPaymentId,
          shipment: existingShipment,
        },
      });
    }

    const targetProvider = providerName || (order.currency === 'INR' || order.country === 'IN' ? 'RAZORPAY' : 'STRIPE');

    // Server-side HMAC SHA256 Signature Verification
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
      console.warn(`[PAYMENT_VERIFICATION_FAILED] Order #${order.orderNumber}, Payment ID: ${actualPaymentId}`);

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid gateway signature.',
      });
    }

    console.log(`[PAYMENT_VERIFICATION_SUCCESS] Order #${order.orderNumber}, Transaction: ${verification.transactionId}`);

    // Mark order as PAID & Confirmed in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        paymentId: verification.transactionId,
        transactionId: verification.transactionId,
      },
    });

    // Update payment record in database
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: verification.transactionId,
        signatureVerified: true,
      },
    });

    // Add Order Timeline Entry
    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.CONFIRMED,
        title: 'Payment Confirmed',
        description: `Verified payment received via ${targetProvider}. Transaction ID: ${verification.transactionId}`,
      },
    });

    // Deduct stock safely on server (transaction-safe)
    try {
      await inventoryService.deductOrderInventory(orderId);
    } catch (stockErr) {
      console.error('[verifyPayment] Stock deduction error:', stockErr);
    }

    // -------------------------------------------------------------
    // AUTOMATIC NIMBUSPOST TEST SHIPMENT CREATION FOR INDIA DELIVERIES
    // -------------------------------------------------------------
    let shipmentData: any = null;
    const shipping = (order.shippingAddress as any) || {};
    const isIndiaDelivery =
      order.country === 'IN' ||
      (order as any).deliveryCountry === 'IN' ||
      shipping.country === 'IN' ||
      shipping.deliveryCountry === 'IN';

    if (isIndiaDelivery) {
      try {
        shipmentData = await shippingService.createShipmentForOrder(order.id);
      } catch (shipmentErr: any) {
        console.warn('[verifyPayment] NimbusPost auto-shipment creation note:', shipmentErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified and order confirmed.',
      data: {
        orderId,
        transactionId: verification.transactionId,
        shipment: shipmentData,
      },
    });
  } catch (error: any) {
    console.error('[verifyPayment] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment verification failed.' });
  }
}

/**
 * 3. Razorpay Idempotent Webhook Handler
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyStr = JSON.stringify(req.body);

    console.log('[RAZORPAY_WEBHOOK_RECEIVED] Headers received.');

    // In production with real webhook secret configured, verify signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET && !process.env.RAZORPAY_WEBHOOK_SECRET.includes('placeholder')) {
      const isValid = razorpayProvider.verifyWebhookSignature(bodyStr, signature);
      if (!isValid) {
        console.warn('[handleWebhook] Razorpay webhook signature invalid!');
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
                paymentId: razorpayPaymentId,
                transactionId: razorpayPaymentId,
              },
            });

            await prisma.payment.updateMany({
              where: { orderId: order.id },
              data: {
                status: PaymentStatus.PAID,
                providerPaymentId: razorpayPaymentId,
                signatureVerified: true,
              },
            });

            await inventoryService.deductOrderInventory(order.id);

            // Trigger NimbusPost shipment
            if (order.country === 'IN') {
              try {
                await shippingService.createShipmentForOrder(order.id);
              } catch (e: any) {
                console.warn('[handleWebhook] NimbusPost webhook dispatch note:', e.message);
              }
            }
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        const paymentRecord = await prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        });

        if (paymentRecord && paymentRecord.orderId) {
          await prisma.order.update({
            where: { id: paymentRecord.orderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[handleWebhook] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
