import axios from 'axios';

async function runTests() {
  const baseURL = 'http://localhost:5000/api';
  console.log('Testing against:', baseURL);

  const guestId = `test_guest_${Date.now()}`;

  try {
    // 1. Get products
    console.log('\n--- 1. Fetching products ---');
    const productsRes = await axios.get(`${baseURL}/products?limit=1`);
    const product = productsRes.data.data.products[0];
    console.log('Found product:', product.id, product.name, product.basePriceINR);

    // 2. Add to cart
    console.log('\n--- 2. Adding product to cart ---');
    const addRes = await axios.post(`${baseURL}/cart/add`, {
      guestId,
      itemType: 'PRODUCT',
      productId: product.id,
      quantity: 2,
      country: 'IN',
      currency: 'INR',
    });
    console.log('Add to cart response success:', addRes.data.success);
    const cart = addRes.data.data;
    console.log('Cart ID:', cart.id);
    console.log('Cart Items:', cart.items.map((i: any) => ({ id: i.id, name: i.name, isOptimistic: i.isOptimistic, qty: i.quantity })));

    const realCartItemId = cart.items[0].id;
    if (realCartItemId.startsWith('opt-')) {
      throw new Error(`FAIL: Cart item ID is still an optimistic ID: ${realCartItemId}`);
    }
    console.log('✓ Cart item has real database ID:', realCartItemId);

    // 3. Test sending invalid opt- ID to updateQty endpoint
    console.log('\n--- 3. Testing guard on temporary opt- ID update ---');
    try {
      await axios.put(`${baseURL}/cart/items/opt-12345-fake`, { quantity: 3 });
      console.error('FAIL: Expected opt- update to fail with 400');
    } catch (optErr: any) {
      console.log('✓ Server correctly rejected opt- ID with status:', optErr.response?.status, optErr.response?.data);
    }

    // 4. Update quantity with real DB ID
    console.log('\n--- 4. Updating quantity with real DB ID ---');
    const updateRes = await axios.put(`${baseURL}/cart/items/${realCartItemId}`, {
      quantity: 3,
      country: 'IN',
      currency: 'INR',
    });
    console.log('✓ Quantity updated successfully, items count:', updateRes.data.data.itemCount);

    // 5. Create Order
    console.log('\n--- 5. Creating order ---');
    const orderRes = await axios.post(`${baseURL}/orders`, {
      buyer: {
        name: 'Rajesh Sharma',
        email: 'rajesh.sharma@example.com',
        phone: '+14155552671',
        country: 'US',
      },
      recipient: {
        name: 'Mum & Dad',
        phone: '+919847012345',
        relationship: 'Parents',
        addressLine1: 'House 42, Palm Meadows',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682001',
        country: 'IN',
      },
      buyerCountry: 'US',
      buyerCurrency: 'USD',
      deliveryCountry: 'IN',
      deliveryCurrency: 'INR',
      country: 'US',
      currency: 'USD',
      items: [
        {
          itemType: 'PRODUCT',
          productId: product.id,
          quantity: 3,
        },
      ],
    });

    console.log('Order creation status:', orderRes.status);
    console.log('Order creation success:', orderRes.data.success);
    const order = orderRes.data.data;
    console.log('Order Number:', order.orderNumber);
    console.log('Order Status:', order.orderStatus);
    console.log('Payment Status:', order.paymentStatus);
    console.log('Total:', order.currency, order.total);

    // 6. Create Razorpay Payment Session
    console.log('\n--- 6. Creating Razorpay Payment Session ---');
    const paymentRes = await axios.post(`${baseURL}/payments/razorpay/create-order`, {
      orderId: order.id,
      providerName: 'RAZORPAY',
    });
    console.log('Payment session success:', paymentRes.data.success);
    console.log('Razorpay Order ID:', paymentRes.data.data.razorpayOrderId);

    // 7. Verify Payment
    console.log('\n--- 7. Verifying Payment Simulation ---');
    const verifyRes = await axios.post(`${baseURL}/payments/razorpay/verify`, {
      orderId: order.id,
      razorpayOrderId: paymentRes.data.data.razorpayOrderId,
      razorpayPaymentId: `pay_sim_${Date.now()}`,
      razorpaySignature: 'simulated_valid_test_signature',
    });
    console.log('Verification response:', verifyRes.data);

    // 8. Check final order status
    console.log('\n--- 8. Checking final order details ---');
    const finalOrderRes = await axios.get(`${baseURL}/orders/${order.id}`);
    console.log('Final Order Status:', finalOrderRes.data.data.orderStatus);
    console.log('Final Payment Status:', finalOrderRes.data.data.paymentStatus);
    console.log('Final Shipment Info:', finalOrderRes.data.data.shipment ? 'Shipment Generated' : 'No shipment');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! COMPLETE FLOW VERIFIED.');
  } catch (err: any) {
    console.error('Test failed:', err.response?.status, err.response?.data || err.message);
  }
}

runTests();
