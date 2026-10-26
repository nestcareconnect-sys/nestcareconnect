import dotenv from 'dotenv';
dotenv.config();

async function testShipmentFlags() {
  const baseUrl = process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com/v1';
  const email = process.env.NIMBUSPOST_EMAIL;
  const password = process.env.NIMBUSPOST_PASSWORD;

  const loginRes = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token || loginJson?.token || (typeof loginJson?.data === 'string' ? loginJson.data : null);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const variations = [
    { name: 'request_auto_pickup=no', extra: { request_auto_pickup: 'no' } },
    { name: 'courier_id=0', extra: { courier_id: 0 } },
    { name: 'courier_id=""', extra: { courier_id: '' } },
    { name: 'is_draft=1', extra: { is_draft: 1 } },
    { name: 'status=new', extra: { status: 'new' } },
    { name: 'status=pending', extra: { status: 'pending' } },
    { name: 'ship_now=0', extra: { ship_now: 0 } },
    { name: 'ship_now=false', extra: { ship_now: false } },
    { name: 'book_shipment=false', extra: { book_shipment: false } },
  ];

  for (const v of variations) {
    const payload = {
      order_number: `FLAG-TEST-${Date.now().toString().slice(-6)}-${v.name.slice(0, 5)}`,
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
        name: 'Test Consignee',
        phone: '9876543210',
        email: 'test@nestcareconnect.com',
        address: 'MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      order_items: [
        {
          name: 'Care Item',
          qty: 1,
          price: 500,
          sku: 'SKU-001',
        },
      ],
      ...v.extra,
    };

    try {
      const res = await fetch(`${baseUrl}/shipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log(`[${v.name}] HTTP ${res.status}: status=${json.status}, awb=${json.data?.awb_number}, courier=${json.data?.courier_name}, order_status=${json.data?.status}`);
    } catch (e: any) {
      console.log(`[${v.name}] Error:`, e.message);
    }
  }
}

testShipmentFlags();
