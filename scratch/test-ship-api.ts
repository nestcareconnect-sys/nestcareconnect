import dotenv from 'dotenv';
dotenv.config();

async function testShipApi() {
  const apiKey = process.env.NIMBUSPOST_API_KEY || 'npk_5dc4b8cfb807b6bb';
  const apiSecret = process.env.NIMBUSPOST_SECRET || 'sx5lLgQDW3UfxwBVEiGs3OZvarytFNmw';

  console.log('Testing with API Key:', apiKey);

  const headerVariations = [
    { 'api-key': apiKey },
    { 'api_key': apiKey },
    { 'apikey': apiKey },
    { 'x-api-key': apiKey },
    { 'Authorization': apiKey },
    { 'Authorization': `Bearer ${apiKey}` },
    { 'api-key': apiKey, 'api-secret': apiSecret },
    { 'key': apiKey, 'secret': apiSecret },
  ];

  for (const h of headerVariations) {
    try {
      const res = await fetch('https://ship.nimbuspost.com/api/orders', {
        method: 'GET',
        headers: {
          ...h,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const text = await res.text();
      console.log(`[Headers: ${JSON.stringify(h)}] status: ${res.status} | body: ${text.slice(0, 150)}`);
    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testShipApi();
