import dotenv from 'dotenv';
dotenv.config();

async function probeEndpoints() {
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

  console.log('Token acquired:', Boolean(token));

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const candidates = [
    { method: 'GET', path: '/orders' },
    { method: 'POST', path: '/orders' },
    { method: 'POST', path: '/order' },
    { method: 'GET', path: '/order' },
    { method: 'GET', path: '/shipments' },
    { method: 'GET', path: '/shipments?status=new' },
    { method: 'GET', path: '/shipments?status=unshipped' },
    { method: 'POST', path: '/shipments/create' },
    { method: 'POST', path: '/shipments/add' },
    { method: 'POST', path: '/channels' },
    { method: 'GET', path: '/channels' },
    { method: 'GET', path: '/couriers' },
    { method: 'GET', path: '/users' },
    { method: 'GET', path: '/warehouses' },
    { method: 'GET', path: '/pickup-locations' },
    { method: 'POST', path: '/v2/orders' },
    { method: 'POST', path: '/v2/shipments' },
  ];

  for (const c of candidates) {
    try {
      const url = c.path.startsWith('/v2')
        ? `https://api.nimbuspost.com${c.path}`
        : `${baseUrl}${c.path}`;

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

probeEndpoints();
