import dotenv from 'dotenv';
dotenv.config();

async function probeShipApiKeys() {
  const apiKey = process.env.NIMBUSPOST_API_KEY || '';
  const email = process.env.NIMBUSPOST_EMAIL || '';
  const password = process.env.NIMBUSPOST_PASSWORD || '';

  // Get token
  const resLogin = await fetch('https://ship.nimbuspost.com/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const jsonLogin = await resLogin.json();
  const token = jsonLogin.data;

  console.log('Login token acquired.');

  const tests = [
    { url: `https://ship.nimbuspost.com/api/orders?api_key=${apiKey}`, method: 'GET' },
    { url: `https://ship.nimbuspost.com/api/orders?apiKey=${apiKey}`, method: 'GET' },
    { url: `https://ship.nimbuspost.com/api/orders?key=${apiKey}`, method: 'GET' },
    { url: `https://ship.nimbuspost.com/api/orders?token=${token}`, method: 'GET' },
    { url: `https://ship.nimbuspost.com/api/orders`, method: 'POST', body: { api_key: apiKey } },
    { url: `https://ship.nimbuspost.com/api/orders`, method: 'POST', body: { apiKey } },
    { url: `https://ship.nimbuspost.com/api/orders`, method: 'POST', body: { token } },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: t.body ? JSON.stringify(t.body) : undefined,
      });
      const text = await res.text();
      console.log(`${t.method} ${t.url} -> Status ${res.status}: ${text.slice(0, 150)}`);
    } catch (e: any) {
      console.log(`Error on ${t.url}:`, e.message);
    }
  }
}

probeShipApiKeys();
