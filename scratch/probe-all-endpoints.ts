import dotenv from 'dotenv';
dotenv.config();

async function probeAllPossibleOrderEndpoints() {
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

  const candidateUrls = [
    'https://api.nimbuspost.com/v1/orders',
    'https://api.nimbuspost.com/v1/orders/create',
    'https://api.nimbuspost.com/v1/channel/orders',
    'https://api.nimbuspost.com/v1/channel/order',
    'https://api.nimbuspost.com/v1/custom-channel/orders',
    'https://api.nimbuspost.com/v1/channels',
    'https://api.nimbuspost.com/v1/shipments/draft',
    'https://api.nimbuspost.com/v1/shipments/unbooked',
    'https://api.nimbuspost.com/v1/shipments/order',
    'https://ship.nimbuspost.com/api/orders',
    'https://ship.nimbuspost.com/api/v1/orders',
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { method: 'GET', headers });
      const text = await res.text();
      console.log(`[GET ${url}] status: ${res.status} | body: ${text.slice(0, 100)}`);
    } catch (e: any) {
      console.log(`[GET ${url}] error: ${e.message}`);
    }
  }
}

probeAllPossibleOrderEndpoints();
