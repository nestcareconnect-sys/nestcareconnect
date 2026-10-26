import dotenv from 'dotenv';
dotenv.config();

async function testMultipartApiKey() {
  const apiKey = process.env.NIMBUSPOST_API_KEY || '';
  const email = process.env.NIMBUSPOST_EMAIL || '';
  const password = process.env.NIMBUSPOST_PASSWORD || '';

  const resLogin = await fetch('https://ship.nimbuspost.com/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const jsonLogin = await resLogin.json();
  const token = jsonLogin.data;

  // Let's test different headers and form fields for API key
  const attempts = [
    { name: 'formData api_key', form: { api_key: apiKey }, headers: {} },
    { name: 'formData apiKey', form: { apiKey: apiKey }, headers: {} },
    { name: 'formData key', form: { key: apiKey }, headers: {} },
    { name: 'header api-key', form: {}, headers: { 'api-key': apiKey } },
    { name: 'header api_key', form: {}, headers: { 'api_key': apiKey } },
    { name: 'header apikey', form: {}, headers: { 'apikey': apiKey } },
    { name: 'header x-api-key', form: {}, headers: { 'x-api-key': apiKey } },
    { name: 'bearer token + header api-key', form: {}, headers: { 'Authorization': `Bearer ${token}`, 'api-key': apiKey } },
    { name: 'bearer token + formData api_key', form: { api_key: apiKey }, headers: { 'Authorization': `Bearer ${token}` } },
  ];

  for (const a of attempts) {
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(a.form)) {
        fd.append(k, v as string);
      }
      fd.append('order_number', 'TEST-001');

      const res = await fetch('https://ship.nimbuspost.com/api/orders', {
        method: 'POST',
        headers: {
          ...a.headers,
        },
        body: fd,
      });
      const text = await res.text();
      console.log(`[${a.name}] status: ${res.status} | body: ${text.slice(0, 200)}`);
    } catch (e: any) {
      console.log(`[${a.name}] error: ${e.message}`);
    }
  }
}

testMultipartApiKey();
