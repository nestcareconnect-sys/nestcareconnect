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

async function runTests() {
  console.log('🧪 Running comprehensive Hamper Update tests against:', API_BASE);

  // 1. Test fetching hamper by slug
  console.log('\n--- Test 1: GET /api/hampers/hamper-essential-care or essential-care-hamper ---');
  let getRes;
  try {
    getRes = await axios.get(`${API_BASE}/hampers/essential-care-hamper`);
    console.log('✅ Found by slug essential-care-hamper:', getRes.data.data.name);
  } catch (err) {
    try {
      getRes = await axios.get(`${API_BASE}/hampers/hamper-essential-care`);
      console.log('✅ Found by ID hamper-essential-care:', getRes.data.data.name);
    } catch (err2) {
      console.error('❌ Failed to find hamper:', err2.message);
    }
  }

  // 2. Test updating hamper via slug 'hamper-essential-care' (The exact error case from user request)
  console.log('\n--- Test 2: PUT /api/hampers/hamper-essential-care (with photo personalization fields) ---');
  try {
    const payload = {
      name: 'Essential Care Hamper (Updated)',
      description: 'Updated comprehensive elderly care package with diagnostic checks.',
      fixedPriceINR: 4999,
      stock: 75,
      allowPhotoUpload: true,
      maxPhotos: 3,
      photoRequired: false,
      photoCardEnabled: true,
      photoInstructions: 'Upload up to 3 special family photos for the keepsake card.',
      allowVideoQR: true,
      countryPrices: [
        { country: 'AE', currency: 'AED', fixedPrice: 225 },
        { country: 'US', currency: 'USD', fixedPrice: 69 },
      ],
    };

    const updateRes = await axios.put(`${API_BASE}/hampers/hamper-essential-care`, payload, { headers });
    console.log('✅ Update response status:', updateRes.status);
    console.log('✅ Update response success:', updateRes.data.success);
    console.log('✅ Updated Hamper name in response:', updateRes.data.data.name);
    console.log('✅ Updated Hamper allowPhotoUpload:', updateRes.data.data.allowPhotoUpload);
    console.log('✅ Updated Hamper maxPhotos:', updateRes.data.data.maxPhotos);
    console.log('✅ Updated Hamper photoInstructions:', updateRes.data.data.photoInstructions);
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.response?.status, err.response?.data || err.message);
  }

  // 3. Test changing allowPhotoUpload to false and verify persistence
  console.log('\n--- Test 3: PUT /api/hampers/hamper-essential-care (allowPhotoUpload = false) ---');
  try {
    const payloadFalse = {
      allowPhotoUpload: false,
      maxPhotos: 3,
    };
    const updateRes2 = await axios.put(`${API_BASE}/hampers/hamper-essential-care`, payloadFalse, { headers });
    console.log('✅ allowPhotoUpload set to false:', updateRes2.data.data.allowPhotoUpload === false);
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.response?.status, err.response?.data || err.message);
  }

  // 4. Test changing maxPhotos to 5 and allowPhotoUpload to true
  console.log('\n--- Test 4: PUT /api/hampers/hamper-essential-care (allowPhotoUpload = true, maxPhotos = 5) ---');
  try {
    const payloadTrue = {
      name: 'Essential Care Hamper',
      allowPhotoUpload: true,
      maxPhotos: 5,
      photoInstructions: 'Upload up to 5 special family photos for the keepsake card.',
    };
    const updateRes3 = await axios.put(`${API_BASE}/hampers/hamper-essential-care`, payloadTrue, { headers });
    console.log('✅ allowPhotoUpload set to true:', updateRes3.data.data.allowPhotoUpload === true);
    console.log('✅ maxPhotos updated to 5:', updateRes3.data.data.maxPhotos === 5);
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\n🎉 ALL TESTS COMPLETED.');
}

runTests();
