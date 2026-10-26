import dotenv from 'dotenv';
dotenv.config();
import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';

async function test() {
  const provider = new NimbusPostShippingProvider();
  const config = await provider.getConfig();
  const { token, authHeader } = await provider.getAuthToken();
  console.log('Got token:', !!token);

  // Test 1: with weight 0.5kg
  const r1 = await fetch(config.baseUrl + '/courier/serviceability', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: '560001', destination: '695121', weight: 0.5, payment_type: 'prepaid' })
  });
  const d1 = await r1.json();
  console.log('Weight 0.5kg sample rates:', d1.data?.slice(0, 3).map((c: any) => ({ name: c.courier_name, rate: c.total_charges || c.freight_charges })));

  // Test 2: with weight 2.5kg
  const r2 = await fetch(config.baseUrl + '/courier/serviceability', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: '560001', destination: '695121', weight: 2.5, payment_type: 'prepaid' })
  });
  const d2 = await r2.json();
  console.log('Weight 2.5kg sample rates:', d2.data?.slice(0, 3).map((c: any) => ({ name: c.courier_name, rate: c.total_charges || c.freight_charges })));

  // Test 3: with dimensions length, breadth, height
  // 30 x 20 x 25 = 15000 cm3 -> Volumetric @ 5000 is 3.0 kg
  const r3 = await fetch(config.baseUrl + '/courier/serviceability', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: '560001', destination: '695121', weight: 0.5, length: 30, breadth: 20, height: 25, payment_type: 'prepaid' })
  });
  const d3 = await r3.json();
  console.log('With dimensions 30x20x25 sample rates:', d3.data?.slice(0, 3).map((c: any) => ({ name: c.courier_name, rate: c.total_charges || c.freight_charges })));
}
test();
