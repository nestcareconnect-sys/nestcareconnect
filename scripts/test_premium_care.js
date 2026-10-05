import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'nest_care_connect_super_secret_jwt_key_2026_production';
const PORT = process.env.PORT || 5000;
const API_BASE = `http://localhost:${PORT}/api`;

const adminToken = jwt.sign(
  {
    id: 'test-admin-id',
    email: 'admin@nestcareconnect.com',
    role: 'ADMIN',
    name: 'Admin Test',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};

async function testPremiumCare() {
  console.log('🧪 Testing Premium Care Hamper update...');

  // 1. Fetch current hamper
  let getRes;
  try {
    getRes = await axios.get(`${API_BASE}/hampers/hamper-premium-care`);
    console.log('✅ GET /hampers/hamper-premium-care succeeded:', getRes.data.data.name, 'ID:', getRes.data.data.id, 'Slug:', getRes.data.data.slug);
  } catch (err) {
    console.log('❌ GET /hampers/hamper-premium-care failed:', err.response?.status, err.response?.data);
  }

  // 2. Fetch with slug 'premium-care-hamper'
  try {
    getRes = await axios.get(`${API_BASE}/hampers/premium-care-hamper`);
    console.log('✅ GET /hampers/premium-care-hamper succeeded:', getRes.data.data.name, 'ID:', getRes.data.data.id, 'Slug:', getRes.data.data.slug);
  } catch (err) {
    console.log('❌ GET /hampers/premium-care-hamper failed:', err.response?.status, err.response?.data);
  }

  // 3. What does AdminHampersPage send when editing hamper-premium-care?
  // Let's simulate the EXACT payload constructed in AdminHampersPage.tsx
  const payloadFromAdmin = {
    name: 'Premium Care Hamper',
    slug: 'premium-care-hamper',
    hamperType: 'PREMIUM',
    description: 'A more luxurious version of our Essential Care Hamper. Packed in a signature magnetic closure keepsake gift box with luxury towel, floral posy, and personalized family video QR greeting card.',
    shortDescription: 'Full diagnostic suite + Egyptian towel, floral posy, treats & Video QR greeting.',
    images: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80'],
    pricingType: 'FIXED',
    fixedPriceINR: 7499,
    stock: 50,
    items: [
      { productId: 'prod-omron-bp-monitor', quantity: 1 },
      { productId: 'prod-accucheck-glucometer', quantity: 1 },
      { productId: 'prod-infrared-thermometer', quantity: 1 },
      { productId: 'prod-pill-organiser-7day', quantity: 1 },
      { productId: 'prod-luxury-bath-towel', quantity: 1 },
      { productId: 'prod-ayurvedic-soap-luxury', quantity: 1 },
      { productId: 'prod-kerala-arabica-coffee', quantity: 1 },
      { productId: 'prod-premium-roasted-cashews', quantity: 1 },
      { productId: 'prod-floral-arrangement', quantity: 1 },
    ],
    allowCustomMessage: true,
    allowPhotos: true,
    allowPhotoUpload: true,
    maxPhotos: 3,
    photoRequired: false,
    photoInstructions: 'Add a special family photo to include inside the keepsake greeting card.',
    photoCardEnabled: true,
    allowVideoQR: true,
    recipientType: 'PARENTS',
    occasion: 'ANNIVERSARY',
    recipientTypes: ['PARENTS'],
    occasions: ['ANNIVERSARY'],
    countryPrices: [
      { country: 'AE', currency: 'AED', fixedPrice: 330 },
      { country: 'US', currency: 'USD', fixedPrice: 99 },
    ],
  };

  console.log('\n--- Sending PUT /api/hampers/hamper-premium-care ---');
  try {
    const putRes = await axios.put(`${API_BASE}/hampers/hamper-premium-care`, payloadFromAdmin, { headers });
    console.log('✅ PUT succeeded! Status:', putRes.status, 'Response:', putRes.data);
  } catch (err) {
    console.error('❌ PUT /hampers/hamper-premium-care failed!');
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
  }

  console.log('\n--- Sending PUT /api/hampers/premium-care-hamper ---');
  try {
    const putRes2 = await axios.put(`${API_BASE}/hampers/premium-care-hamper`, payloadFromAdmin, { headers });
    console.log('✅ PUT succeeded! Status:', putRes2.status, 'Response:', putRes2.data);
  } catch (err) {
    console.error('❌ PUT /hampers/premium-care-hamper failed!');
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
  }
}

testPremiumCare();
