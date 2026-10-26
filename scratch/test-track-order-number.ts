import dotenv from 'dotenv';
dotenv.config();

async function testTrackByOrderNumber() {
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

  const orderNumber = 'DIAG-SHIP-1792839141692';
  try {
    const res = await fetch(`${baseUrl}/shipments/track/${orderNumber}`, { headers });
    const json = await res.json().catch(() => ({}));
    console.log(`GET /v1/shipments/track/${orderNumber}: status ${res.status}`, JSON.stringify(json).slice(0, 300));
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

testTrackByOrderNumber();
