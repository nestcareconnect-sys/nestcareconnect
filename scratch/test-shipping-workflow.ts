import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Nest Care Connect Shipping Workflow Tests');
  console.log('====================================================');

  try {
    // Step 1: Login Admin
    console.log('\n[1] Authenticating Admin...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@nestcareconnect.com',
      password: 'Admin@123456',
    });
    const adminToken = adminLoginRes.data.data.token;
    console.log('✅ Admin authenticated successfully.');

    // Step 2: Login Customer
    console.log('\n[2] Authenticating Customer...');
    const custLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'customer@nestcareconnect.com',
      password: 'User@123456',
    });
    const custToken = custLoginRes.data.data.token;
    const custUser = custLoginRes.data.data.user;
    console.log(`✅ Customer authenticated: ${custUser.email} (ID: ${custUser.id})`);

    // Helper headers
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    const custHeaders = { headers: { Authorization: `Bearer ${custToken}` } };

    // Fetch an active product
    const productsRes = await axios.get(`${BASE_URL}/products?limit=1`);
    const product = productsRes.data.data.products[0];
    if (!product) throw new Error('No product found to create order');
    console.log(`Found active product for test orders: "${product.name}" (₹${product.basePriceINR})`);

    // Helper to create an order as customer
    async function createTestOrder(label: string) {
      console.log(`\n--- Placing Customer Order for ${label} ---`);
      const orderPayload = {
        buyer: {
          name: 'Rajesh Sharma',
          email: 'customer@nestcareconnect.com',
          phone: '+1 415 555 2671',
          country: 'US',
        },
        recipient: {
          name: 'Savita Sharma',
          phone: '+91  8921342411',
          addressLine1: 'Flat 402, Green Glen Layout, Bellandur',
          addressLine2: 'Near Outer Ring Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560103',
          country: 'India',
        },
        buyerCountry: 'US',
        buyerCurrency: 'USD',
        deliveryCountry: 'IN',
        deliveryCurrency: 'INR',
        currency: 'INR',
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      };

      const orderRes = await axios.post(`${BASE_URL}/orders`, orderPayload, custHeaders);
      const order = orderRes.data.data;
      console.log(`✅ Order placed: #${order.orderNumber} (ID: ${order.id})`);

      // Process Demo Payment
      const payRes = await axios.post(`${BASE_URL}/payments/demo/process`, { orderId: order.id }, custHeaders);
      console.log(`✅ Demo payment confirmed. Payment status: ${payRes.data.data.paymentStatus}`);

      // Verify requirement 1: Stop Automatic NimbusPost shipment creation
      const checkRes = await axios.get(`${BASE_URL}/orders/${order.id}`, custHeaders);
      const currentOrder = checkRes.data.data;
      
      if (currentOrder.shipment) {
        throw new Error(`❌ FAIL: Shipment was automatically created! Expected no shipment on order placement.`);
      }
      console.log(`✅ VERIFIED: No automatic NimbusPost shipment created! Order is pending fulfillment.`);
      console.log(`   Order Status: ${currentOrder.orderStatus} | Shipping Method: ${currentOrder.shippingMethod}`);

      return currentOrder;
    }

    // -------------------------------------------------------------
    // Test Option A: Ship Manually
    // -------------------------------------------------------------
    const orderA = await createTestOrder('Option A (Ship Manually)');

    console.log('\n[Admin Action] Fulfilling Order A via Ship Manually...');
    const manualShipRes = await axios.post(
      `${BASE_URL}/shipping/manual`,
      {
        orderId: orderA.id,
        courierName: 'Blue Dart Express',
        trackingNumber: 'BD-884920194',
        trackingUrl: 'https://www.bluedart.com/tracking/BD-884920194',
        dispatchDate: new Date().toISOString(),
        shippingNotes: 'Fragile medical supplies. Handle with extreme care.',
      },
      adminHeaders
    );
    console.log('✅ Ship Manually API returned success.');

    // Verify Customer view of Order A
    const custOrderARes = await axios.get(`${BASE_URL}/orders/${orderA.id}`, custHeaders);
    const updatedOrderA = custOrderARes.data.data;
    console.log('Customer Order Details for Option A:');
    console.log(`  - Order Status: ${updatedOrderA.orderStatus}`);
    console.log(`  - Shipping Method: ${updatedOrderA.shippingMethod} (${updatedOrderA.shippingMethodLabel})`);
    console.log(`  - Courier: ${updatedOrderA.shipment?.courierName || updatedOrderA.courierName}`);
    console.log(`  - Tracking ID: ${updatedOrderA.shipment?.trackingNumber || updatedOrderA.trackingNumber}`);
    console.log(`  - Tracking URL: ${updatedOrderA.shipment?.trackingUrl || updatedOrderA.trackingUrl}`);

    if (updatedOrderA.orderStatus !== 'SHIPPED') throw new Error('Order A is not marked SHIPPED');
    if (updatedOrderA.shippingMethod !== 'MANUAL') throw new Error('Order A shippingMethod is not MANUAL');
    if (!updatedOrderA.trackingUrl?.includes('bluedart')) throw new Error('Order A tracking URL missing');
    console.log('✅ Option A (Ship Manually) fully verified!');

    // -------------------------------------------------------------
    // Test Option B: Ship via NimbusPost (Automated)
    // -------------------------------------------------------------
    const orderB = await createTestOrder('Option B (NimbusPost Automated)');

    console.log('\n[Admin Action] Fetching package details for Option B review dialog...');
    const pkgDetailsBRes = await axios.get(
      `${BASE_URL}/shipping/order-package/${orderB.id}`,
      adminHeaders
    );
    const pkgB = pkgDetailsBRes.data.data;
    console.log('Authoritative Package Details:');
    console.log(`  - Customer: ${pkgB.customerName} (${pkgB.customerPhone})`);
    console.log(`  - Address: ${pkgB.fullAddressString}`);
    console.log(`  - Actual Weight: ${pkgB.packageWeightKg} kg`);
    console.log(`  - Dimensions: ${pkgB.dimensionsString} cm`);
    console.log(`  - Chargeable Weight: ${pkgB.chargeableWeightKg} kg`);
    console.log(`  - Pickup Hub: ${pkgB.pickupHub.hubName} (${pkgB.pickupHub.pincode})`);

    console.log('\n[Admin Action] Confirming automated NimbusPost shipment creation...');
    const nimbusAutoRes = await axios.post(
      `${BASE_URL}/shipping/nimbus/create-shipment`,
      {
        orderId: orderB.id,
        courierName: 'Delhivery Surface',
      },
      adminHeaders
    );
    console.log(`✅ NimbusPost Automated API response: ${nimbusAutoRes.data.message}`);

    // Verify duplicate prevention
    console.log('\n[Security Check] Testing duplicate shipment prevention...');
    try {
      await axios.post(
        `${BASE_URL}/shipping/nimbus/create-shipment`,
        {
          orderId: orderB.id,
          courierName: 'Delhivery Surface',
        },
        adminHeaders
      );
      throw new Error('❌ FAIL: Duplicate shipment was allowed!');
    } catch (dupErr: any) {
      if (dupErr.response && dupErr.response.status === 400) {
        console.log(`✅ PASS: Duplicate shipment correctly blocked! Response: "${dupErr.response.data.message}"`);
      } else {
        throw dupErr;
      }
    }

    // Verify Customer view of Order B
    const custOrderBRes = await axios.get(`${BASE_URL}/orders/${orderB.id}`, custHeaders);
    const updatedOrderB = custOrderBRes.data.data;
    console.log('Customer Order Details for Option B:');
    console.log(`  - Order Status: ${updatedOrderB.orderStatus}`);
    console.log(`  - Shipping Method: ${updatedOrderB.shippingMethod} (${updatedOrderB.shippingMethodLabel})`);
    console.log(`  - Courier: ${updatedOrderB.shipment?.courierName}`);
    console.log(`  - Tracking ID: ${updatedOrderB.shipment?.trackingNumber || updatedOrderB.shipment?.awbNumber}`);
    console.log(`  - Tracking URL: ${updatedOrderB.shipment?.trackingUrl}`);

    if (updatedOrderB.orderStatus !== 'SHIPPED') throw new Error('Order B is not marked SHIPPED');
    if (updatedOrderB.shippingMethod !== 'NIMBUSPOST_AUTOMATED') throw new Error('Order B shippingMethod is not NIMBUSPOST_AUTOMATED');
    console.log('✅ Option B (NimbusPost Automated) fully verified!');

    // -------------------------------------------------------------
    // Test Option C: Ship via NimbusPost (Manual)
    // -------------------------------------------------------------
    const orderC = await createTestOrder('Option C (NimbusPost Manual)');

    console.log('\n[Admin Action] Fetching package details for NimbusPost manual order entry...');
    const pkgDetailsCRes = await axios.get(
      `${BASE_URL}/shipping/order-package/${orderC.id}`,
      adminHeaders
    );
    const pkgC = pkgDetailsCRes.data.data;
    console.log(`✅ Admin copies package info (Weight: ${pkgC.packageWeightKg}kg, Dim: ${pkgC.dimensionsString})`);

    console.log('\n[Admin Action] Recording manually booked NimbusPost shipment...');
    const recordManualRes = await axios.post(
      `${BASE_URL}/shipping/nimbus/manual-record`,
      {
        orderId: orderC.id,
        awbNumber: 'NIMBUS-MAN-7729104',
        courierName: 'Shadowfax via NimbusPost',
        trackingUrl: 'https://nimbuspost.com/track/NIMBUS-MAN-7729104',
        providerOrderId: 'NP-ORDER-55102',
        dispatchDate: new Date().toISOString(),
        shippingNotes: 'Booked manually on ship.nimbuspost.com dashboard.',
      },
      adminHeaders
    );
    console.log(`✅ NimbusPost Manual record response: ${recordManualRes.data.message}`);

    // Verify Customer view of Order C
    const custOrderCRes = await axios.get(`${BASE_URL}/orders/${orderC.id}`, custHeaders);
    const updatedOrderC = custOrderCRes.data.data;
    console.log('Customer Order Details for Option C:');
    console.log(`  - Order Status: ${updatedOrderC.orderStatus}`);
    console.log(`  - Shipping Method: ${updatedOrderC.shippingMethod} (${updatedOrderC.shippingMethodLabel})`);
    console.log(`  - Courier: ${updatedOrderC.shipment?.courierName}`);
    console.log(`  - Tracking ID: ${updatedOrderC.shipment?.trackingNumber || updatedOrderC.shipment?.awbNumber}`);
    console.log(`  - Tracking URL: ${updatedOrderC.shipment?.trackingUrl}`);

    if (updatedOrderC.orderStatus !== 'SHIPPED') throw new Error('Order C is not marked SHIPPED');
    if (updatedOrderC.shippingMethod !== 'NIMBUSPOST_MANUAL') throw new Error('Order C shippingMethod is not NIMBUSPOST_MANUAL');
    console.log('✅ Option C (NimbusPost Manual) fully verified!');

    // -------------------------------------------------------------
    // Test Security & Ownership
    // -------------------------------------------------------------
    console.log('\n[Security Check] Testing Unauthorized access from non-admin...');
    try {
      await axios.post(
        `${BASE_URL}/shipping/manual`,
        {
          orderId: orderC.id,
          courierName: 'Hacker Courier',
          trackingNumber: 'HACK-123',
        },
        custHeaders
      );
      throw new Error('❌ FAIL: Non-admin was allowed to call admin shipping endpoint!');
    } catch (secErr: any) {
      if (secErr.response && (secErr.response.status === 403 || secErr.response.status === 401)) {
        console.log(`✅ PASS: Non-admin shipping modification blocked with HTTP ${secErr.response.status}!`);
      } else {
        throw secErr;
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL SHIPPING WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================');
  } catch (err: any) {
    console.error('❌ Test failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
