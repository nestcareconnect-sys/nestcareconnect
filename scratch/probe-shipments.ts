import dotenv from 'dotenv';
dotenv.config();

async function probeShipmentSubpaths() {
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

  const candidates = [
    { method: 'POST', path: '/shipments' },
    { method: 'POST', path: '/shipments/order' },
    { method: 'POST', path: '/shipments/import' },
    { method: 'POST', path: '/shipments/orders' },
    { method: 'GET', path: '/shipments/track/test' },
    { method: 'GET', path: '/shipments/label/test' },
    { method: 'POST', path: '/courier/serviceability' },
    { method: 'GET', path: '/courier/list' },
    { method: 'GET', path: '/courier' },
    { method: 'POST', path: '/users/wallet' },
    { method: 'GET', path: '/users/profile' },
  ];

  for (const c of candidates) {
    try {
      const url = `${baseUrl}${c.path}`;
      const res = await fetch(url, {
        method: c.method,
        headers,
        body: c.method === 'POST' ? JSON.stringify({ test: 1 }) : undefined,
      });

      const text = await res.text();
      let preview = text.slice(0, 150);
      try {
        const j = JSON.parse(text);
        preview = JSON.stringify(j).slice(0, 150);
      } catch {}

      console.log(`${c.method} ${c.path} -> ${res.status}: ${preview}`);
    } catch (e: any) {
      console.log(`${c.method} ${c.path} -> ERROR: ${e.message}`);
    }
  }
}

probeShipmentSubpaths();
