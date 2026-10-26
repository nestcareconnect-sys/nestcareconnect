import dotenv from 'dotenv';
dotenv.config();

import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';

async function testServiceability() {
  const provider = new NimbusPostShippingProvider();
  
  console.log('Testing serviceability with origin=695121, dest=560001...');
  const res1 = await provider.checkServiceability({
    originPincode: '695121',
    destinationPincode: '560001',
    weightKg: 1.0,
  });
  console.log('Result 1 (origin=695121):', {
    serviceable: res1.serviceable,
    message: res1.message,
    couriersCount: res1.couriers?.length,
  });

  console.log('Testing serviceability with origin=560001, dest=695121...');
  const res2 = await provider.checkServiceability({
    originPincode: '560001',
    destinationPincode: '695121',
    weightKg: 1.0,
  });
  console.log('Result 2 (origin=560001):', {
    serviceable: res2.serviceable,
    message: res2.message,
    couriersCount: res2.couriers?.length,
  });
}

testServiceability();
