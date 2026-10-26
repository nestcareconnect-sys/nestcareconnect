import dotenv from 'dotenv';
dotenv.config();

async function testPanelApiWithJwt() {
  const email = process.env.NIMBUSPOST_EMAIL || '';
  const password = process.env.NIMBUSPOST_PASSWORD || '';

  console.log('Logging in to https://ship.nimbuspost.com/api/users/login...');
  const resLogin = await fetch('https://ship.nimbuspost.com/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const jsonLogin = await resLogin.json();
  console.log('Login status:', resLogin.status, jsonLogin.status);
  const token = jsonLogin.data;
  console.log('Token starts with:', typeof token === 'string' ? token.slice(0, 25) : 'not string');

  if (!token || typeof token !== 'string') return;

  const authHeaders = [
    { 'Authorization': `Bearer ${token}` },
    { 'token': token },
    { 'Authorization': token },
  ];

  for (const h of authHeaders) {
    try {
      const res = await fetch('https://ship.nimbuspost.com/api/orders', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...h,
        },
      });
      const text = await res.text();
      console.log(`GET /api/orders with header ${Object.keys(h)[0]} -> Status ${res.status}: ${text.slice(0, 200)}`);
    } catch (e: any) {
      console.log('Error GET:', e.message);
    }
  }

  // Also probe POST /api/orders
  console.log('\nTesting POST /api/orders with Bearer token...');
  try {
    const res = await fetch('https://ship.nimbuspost.com/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ test: true }),
    });
    const text = await res.text();
    console.log(`POST /api/orders -> Status ${res.status}: ${text.slice(0, 300)}`);
  } catch (e: any) {
    console.log('Error POST:', e.message);
  }
}

testPanelApiWithJwt();
