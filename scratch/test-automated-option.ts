import dotenv from 'dotenv';
dotenv.config();
import prisma from '../api/config/prisma.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';
import { OrderStatus, PaymentStatus } from '@prisma/client';

async function testAutomatedOption() {
  console.log('Testing Option 2: createNimbusPostAutomatedShipment()...');

  const orderNumber = `TEST-AUTO-${Date.now().toString().slice(-6)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      currency: 'INR',
      subtotal: 999,
      shippingFee: 0,
      total: 999,
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.PROCESSING,
      paymentProvider: 'DEMO',
      shippingAddress: {
        name: 'Dr. Ramesh Kumar',
        phone: '9847054321',
        email: 'ramesh.kumar@example.com',
        addressLine1: '32 Hospital Road, Kadavanthra',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682020',
        country: 'IN',
      },
      items: {
        create: [
          {
            name: 'Diabetic Care Package',
            sku: 'NCC-DIAB-01',
            quantity: 1,
            unitPrice: 999,
            totalPrice: 999,
            snapshot: { weight: 0.8 },
          },
        ],
      },
    },
  });

  const result = await shippingService.createNimbusPostAutomatedShipment(order.id, {
    courierName: 'Delhivery Surface Express',
    allowSimulation: true,
  });

  console.log('Automated Dispatch Result:');
  console.log('  AWB:', result.awbNumber);
  console.log('  Courier:', result.courierName);
  console.log('  Status:', result.shipmentStatus);

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { shipment: true },
  });

  console.log('  Order Shipping Method:', updatedOrder?.shippingMethod);
  console.log('  Order Status:', updatedOrder?.orderStatus);

  // Cleanup
  await prisma.orderTimeline.deleteMany({ where: { orderId: order.id } });
  await prisma.shipment.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });

  console.log('✓ Automated option verified successfully!');
}

testAutomatedOption().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
