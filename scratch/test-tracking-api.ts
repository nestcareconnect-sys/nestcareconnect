import dotenv from 'dotenv';
dotenv.config();

async function testTrackingEndpoints() {
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

  // Test 1: Track existing AWB
  const sampleAwb = 'NBCP3002129275';
  try {
    const res = await fetch(`${baseUrl}/shipments/track/${sampleAwb}`, { headers });
    const json = await res.json().catch(() => ({}));
    console.log(`GET /v1/shipments/track/${sampleAwb}: status ${res.status}`, JSON.stringify(json).slice(0, 300));
  } catch (e: any) {
    console.log(`Track error: ${e.message}`);
  }

  // Test 2: Bulk track by order number or AWB
  try {
    const res = await fetch(`${baseUrl}/shipments/track/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ awb: [sampleAwb] }),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`POST /v1/shipments/track/bulk: status ${res.status}`, JSON.stringify(json).slice(0, 300));
  } catch (e: any) {
    console.log(`Bulk track error: ${e.message}`);
  }
}

testTrackingEndpoints();
