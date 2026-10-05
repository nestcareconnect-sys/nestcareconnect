import axios from 'axios';

async function testIndiaFlow() {
  const baseURL = 'http://localhost:5000/api';
  console.log('Testing India Delivery + NimbusPost Flow');

  const guestId = `test_in_${Date.now()}`;

  // 1. Get product
  const productsRes = await axios.get(`${baseURL}/products?limit=1`);
  const product = productsRes.data.data.products[0];

  // 2. Add to cart
  const addRes = await axios.post(`${baseURL}/cart/add`, {
    guestId,
    itemType: 'PRODUCT',
    productId: product.id,
    quantity: 1,
    country: 'IN',
    currency: 'INR',
  });

  const cart = addRes.data.data;
  console.log('Cart Items:', cart.items.map((i: any) => ({ id: i.id, name: i.name })));

  // 3. Create India Order
  const orderRes = await axios.post(`${baseURL}/orders`, {
    buyer: {
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '+971501234567',
      country: 'AE',
    },
    recipient: {
      name: 'Narayanan Nair & Sarojini',
      phone: '+919847054321',
      relationship: 'Parents',
      addressLine1: 'Nair Villa, MG Road',
      city: 'Kochi',
      state: 'Kerala',
      postalCode: '682001',
      country: 'IN',
    },
    buyerCountry: 'AE',
    buyerCurrency: 'AED',
    deliveryCountry: 'IN',
    deliveryCurrency: 'INR',
    country: 'AE',
    currency: 'AED',
    items: [
      {
        itemType: 'PRODUCT',
        productId: product.id,
        quantity: 1,
      },
    ],
  });

  const order = orderRes.data.data;
  console.log('Order created:', order.orderNumber, 'Total:', order.currency, order.total, 'Status:', order.orderStatus);

  // 4. Create Razorpay session
  const paymentRes = await axios.post(`${baseURL}/payments/razorpay/create-order`, {
    orderId: order.id,
    providerName: 'RAZORPAY',
  });
  console.log('Razorpay Order created:', paymentRes.data.data.razorpayOrderId);

  // 5. Verify payment
  const verifyRes = await axios.post(`${baseURL}/payments/razorpay/verify`, {
    orderId: order.id,
    razorpayOrderId: paymentRes.data.data.razorpayOrderId,
    razorpayPaymentId: `pay_india_${Date.now()}`,
    razorpaySignature: 'valid_india_signature',
  });
  console.log('Verify response:', verifyRes.data.message);

  // 6. Inspect tracking & shipment
  const trackingRes = await axios.get(`${baseURL}/orders/${order.id}/tracking`);
  console.log('Shipment AWB:', trackingRes.data.data.shipment?.awbNumber);
  console.log('Shipment Courier:', trackingRes.data.data.shipment?.courierName);
  console.log('Tracking Status:', trackingRes.data.data.tracking?.status);

  console.log('✓ India delivery with Razorpay + NimbusPost verification completed successfully!');
}

testIndiaFlow().catch(e => console.error(e.response?.data || e.message));
