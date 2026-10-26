import dotenv from 'dotenv';
dotenv.config();

import { NimbusPostShippingProvider } from '../api/services/shipping/nimbuspost.provider.js';

async function checkNimbusLocations() {
  const provider = new NimbusPostShippingProvider();
  const { token, authHeader } = await provider.getAuthToken();
  const config = await provider.getConfig();

  console.log('Testing NimbusPost pickup locations query...');
  
  // Try common NimbusPost warehouse/pickup location endpoints
  const endpoints = [
    `${config.baseUrl}/users/getpickuplocations`,
    `${config.baseUrl}/users/get-pickup-locations`,
    `${config.baseUrl}/warehouses`,
    `${config.baseUrl}/users/warehouses`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      console.log(`Endpoint ${url} -> HTTP ${res.status}:`, JSON.stringify(data).slice(0, 300));
    } catch (e: any) {
      console.log(`Endpoint ${url} -> Error: ${e.message}`);
    }
  }
}

checkNimbusLocations();
