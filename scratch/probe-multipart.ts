import dotenv from 'dotenv';
dotenv.config();

async function testMultipartOrders() {
  const email = process.env.NIMBUSPOST_EMAIL || '';
  const password = process.env.NIMBUSPOST_PASSWORD || '';

  const resLogin = await fetch('https://ship.nimbuspost.com/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const jsonLogin = await resLogin.json();
  const token = jsonLogin.data;

  // 1. Send empty FormData
  console.log('Sending empty FormData to POST https://ship.nimbuspost.com/api/orders...');
  const formData = new FormData();
  formData.append('test', '1');

  const res1 = await fetch('https://ship.nimbuspost.com/api/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  const text1 = await res1.text();
  console.log(`Response 1 (${res1.status}):`, text1);
}

testMultipartOrders();
