import dotenv from 'dotenv';
dotenv.config();

async function probeChannels() {
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

  const channelEndpoints = [
    `${baseUrl}/channels`,
    `${baseUrl}/channel`,
    `${baseUrl}/stores`,
    `${baseUrl}/store`,
    `${baseUrl}/users/profile`,
    `${baseUrl}/users`,
    `${baseUrl}/settings`,
    `${baseUrl}/warehouses`,
    `${baseUrl}/courier`,
  ];

  for (const url of channelEndpoints) {
    try {
      const res = await fetch(url, { headers });
      const text = await res.text();
      console.log(`[GET ${url}] Status ${res.status}: ${text.slice(0, 150)}`);
    } catch (e: any) {
      console.log(`[GET ${url}] Error:`, e.message);
    }
  }
}

probeChannels();
