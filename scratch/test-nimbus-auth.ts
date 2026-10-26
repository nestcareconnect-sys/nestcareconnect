import dotenv from 'dotenv';
dotenv.config();

import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';

async function testNimbusAuth() {
  console.log('Testing NimbusPost Authentication...');
  const provider = new NimbusPostShippingProvider();
  const config = await provider.getConfig();
  console.log('Environment:', config.env);
  console.log('Base URL:', config.baseUrl);
  console.log('Pickup Location (Hub):', config.pickupLocation);
  console.log('Pickup Pincode:', config.pickupPincode);
  console.log('Email configured:', !!config.email);
  console.log('Password configured:', !!config.password);

  try {
    const auth = await provider.getAuthToken(true);
    if (auth.token) {
      console.log('NimbusPost Auth SUCCESS! Token received (length:', auth.token.length, ')');
    } else {
      console.log('NimbusPost Auth returned no token.');
    }
  } catch (err: any) {
    console.error('NimbusPost Auth ERROR:', err.message);
  }
}

testNimbusAuth();
