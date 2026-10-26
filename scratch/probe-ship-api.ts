import dotenv from 'dotenv';
dotenv.config();

async function testShipApi() {
  const apiKey = process.env.NIMBUSPOST_API_KEY || '';
  const email = process.env.NIMBUSPOST_EMAIL || '';
  const password = process.env.NIMBUSPOST_PASSWORD || '';

  console.log('Testing https://ship.nimbuspost.com/api/orders');
  console.log('API Key length:', apiKey.length);

  const headerVariations = [
    { 'api-key': apiKey },
    { 'apikey': apiKey },
    { 'x-api-key': apiKey },
    { 'token': apiKey },
    { 'Authorization': `Bearer ${apiKey}` },
    { 'Authorization': apiKey },
  ];

  for (const h of headerVariations) {
    try {
      const res = await fetch('https://ship.nimbuspost.com/api/orders', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...h,
        },
      });
      const text = await res.text();
      console.log(`Headers ${JSON.stringify(h)} -> Status ${res.status}: ${text.slice(0, 150)}`);
    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  }

  // Also test login on ship.nimbuspost.com
  console.log('\nTesting login on ship.nimbuspost.com:');
  try {
    const res = await fetch('https://ship.nimbuspost.com/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    console.log(`POST https://ship.nimbuspost.com/api/users/login -> Status ${res.status}: ${text.slice(0, 150)}`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

testShipApi();
