import dotenv from 'dotenv';
dotenv.config();

async function testNimbus() {
  const baseUrl = process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com/v1';
  const email = process.env.NIMBUSPOST_EMAIL;
  const password = process.env.NIMBUSPOST_PASSWORD;

  console.log(`[Diagnostic] Base URL: ${baseUrl}`);
  console.log(`[Diagnostic] Email: ${email}`);

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  console.log(`[Diagnostic] Login Status: ${loginRes.status}`, loginJson.status ? 'SUCCESS' : 'FAILED');
  const token = loginJson?.data?.token || loginJson?.token || (typeof loginJson?.data === 'string' ? loginJson.data : null);

  if (!token) {
    console.error('Failed to obtain token from NimbusPost');
    return;
  }
  console.log(`[Diagnostic] Token acquired: ${token.substring(0, 15)}...`);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Test GET /v1/orders
  console.log('\n--- Probing GET /v1/orders ---');
  try {
    const res = await fetch(`${baseUrl}/orders`, { headers });
    const json = await res.json().catch(() => ({}));
    console.log(`GET /v1/orders: status ${res.status}`, JSON.stringify(json).slice(0, 200));
  } catch (e: any) {
    console.log(`GET /v1/orders error: ${e.message}`);
  }

  // 3. Test GET /v1/orders/new or /v1/orders?status=new
  console.log('\n--- Probing GET /v1/orders?status=new ---');
  try {
    const res = await fetch(`${baseUrl}/orders?status=new`, { headers });
    const json = await res.json().catch(() => ({}));
    console.log(`GET /v1/orders?status=new: status ${res.status}`, JSON.stringify(json).slice(0, 200));
  } catch (e: any) {
    console.log(`GET /v1/orders?status=new error: ${e.message}`);
  }

  // 4. Test OPTIONS / POST /v1/orders
  console.log('\n--- Probing POST /v1/orders (Dry run / structure check) ---');
  try {
    const samplePayload = {
      order_number: `DIAG-TEST-${Date.now()}`,
      shipping_charges: 0,
      discount: 0,
      cod_charges: 0,
      payment_type: 'prepaid',
      order_amount: 500,
      package_weight: 500,
      package_length: 10,
      package_breadth: 10,
      package_height: 10,
      pickup: {
        warehouse_name: 'Dhanyasree 1',
        name: 'Dhanyasree 1',
        phone: '9876543210',
        address: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      consignee: {
        name: 'Test Customer',
        phone: '9876543210',
        email: 'test@example.com',
        address: 'MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      order_items: [
        {
          name: 'Health Item',
          qty: 1,
          price: 500,
          sku: 'SKU-001',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(samplePayload),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`POST /v1/orders: status ${res.status}`, JSON.stringify(json).slice(0, 400));
  } catch (e: any) {
    console.log(`POST /v1/orders error: ${e.message}`);
  }

  // 5. Test POST /v1/orders/create
  console.log('\n--- Probing POST /v1/orders/create ---');
  try {
    const res = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`POST /v1/orders/create: status ${res.status}`, JSON.stringify(json).slice(0, 300));
  } catch (e: any) {
    console.log(`POST /v1/orders/create error: ${e.message}`);
  }

  // 6. Test POST /v1/shipments WITHOUT courier_id
  console.log('\n--- Probing POST /v1/shipments WITHOUT courier_id ---');
  try {
    const sampleShipmentPayload = {
      order_number: `DIAG-SHIP-${Date.now()}`,
      shipping_charges: 0,
      discount: 0,
      cod_charges: 0,
      payment_type: 'prepaid',
      order_amount: 500,
      package_weight: 500,
      package_length: 10,
      package_breadth: 10,
      package_height: 10,
      pickup: {
        warehouse_name: 'Dhanyasree 1',
        name: 'Dhanyasree 1',
        phone: '9876543210',
        address: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      consignee: {
        name: 'Test Customer',
        phone: '9876543210',
        email: 'test@example.com',
        address: 'MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      order_items: [
        {
          name: 'Health Item',
          qty: 1,
          price: 500,
          sku: 'SKU-001',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sampleShipmentPayload),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`POST /v1/shipments (no courier_id): status ${res.status}`, JSON.stringify(json).slice(0, 400));
  } catch (e: any) {
    console.log(`POST /v1/shipments error: ${e.message}`);
  }
}

testNimbus();
