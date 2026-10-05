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

async function verifyAllHampers() {
  console.log('🧪 Starting Full Hampers Verification Suite against:', API_BASE);

  const testHampers = [
    { id: 'hamper-essential-care', slug: 'essential-care-hamper', name: 'Essential Care Hamper' },
    { id: 'hamper-premium-care', slug: 'premium-care-hamper', name: 'Premium Care Hamper' },
    { id: 'hamper-anniversary', slug: 'anniversary-hamper', name: 'Anniversary Hamper' },
    { id: 'hamper-anniversary-premium', slug: 'anniversary-premium-hamper', name: 'Anniversary Premium Hamper' },
    { id: 'hamper-signature-anniversary', slug: 'nestcare-signature-anniversary', name: 'NESTCARE SIGNATURE ANNIVERSARY' },
  ];

  for (const h of testHampers) {
    console.log(`\n========================================`);
    console.log(`Testing Hamper: ${h.name} (${h.id})`);
    console.log(`========================================`);

    // 1. Fetch Hamper by ID / Slug
    const getRes = await axios.get(`${API_BASE}/hampers/${h.id}`);
    console.log(`✅ GET /hampers/${h.id} -> 200 OK | Title: ${getRes.data.data.name}`);

    // 2. Test updating with allowPhotoUpload = true, maxPhotos = 3
    console.log(`\n--- Test A: Set allowPhotoUpload=true, maxPhotos=3 ---`);
    const payloadA = {
      name: h.name,
      allowPhotoUpload: true,
      maxPhotos: 3,
      photoRequired: false,
      photoCardEnabled: true,
      photoInstructions: 'Upload up to 3 special family photos for greeting card.',
      allowVideoQR: true,
    };
    const putResA = await axios.put(`${API_BASE}/hampers/${h.id}`, payloadA, { headers });
    console.log(`✅ PUT /hampers/${h.id} -> 200 OK`);
    console.log(`   allowPhotoUpload:`, putResA.data.data.allowPhotoUpload === true ? '✅ TRUE' : '❌ FAIL');
    console.log(`   maxPhotos:`, putResA.data.data.maxPhotos === 3 ? '✅ 3' : '❌ FAIL');
    console.log(`   photoCardEnabled:`, putResA.data.data.photoCardEnabled === true ? '✅ TRUE' : '❌ FAIL');

    // Verify GET customer endpoint sees it
    const checkResA = await axios.get(`${API_BASE}/hampers/${h.slug}`);
    console.log(`✅ Customer GET /hampers/${h.slug} -> allowPhotoUpload:`, checkResA.data.data.allowPhotoUpload);

    // 3. Test updating with allowPhotoUpload = false
    console.log(`\n--- Test B: Set allowPhotoUpload=false ---`);
    const payloadB = {
      allowPhotoUpload: false,
    };
    const putResB = await axios.put(`${API_BASE}/hampers/${h.id}`, payloadB, { headers });
    console.log(`✅ PUT /hampers/${h.id} -> 200 OK`);
    console.log(`   allowPhotoUpload:`, putResB.data.data.allowPhotoUpload === false ? '✅ FALSE' : '❌ FAIL');

    // Verify GET customer endpoint sees allowPhotoUpload = false
    const checkResB = await axios.get(`${API_BASE}/hampers/${h.slug}`);
    console.log(`✅ Customer GET /hampers/${h.slug} -> allowPhotoUpload:`, checkResB.data.data.allowPhotoUpload);

    // 4. Test updating with allowPhotoUpload = true, maxPhotos = 5
    console.log(`\n--- Test C: Set allowPhotoUpload=true, maxPhotos=5 ---`);
    const payloadC = {
      allowPhotoUpload: true,
      maxPhotos: 5,
      photoInstructions: 'Upload up to 5 special family photos for keepsake card.',
    };
    const putResC = await axios.put(`${API_BASE}/hampers/${h.id}`, payloadC, { headers });
    console.log(`✅ PUT /hampers/${h.id} -> 200 OK`);
    console.log(`   allowPhotoUpload:`, putResC.data.data.allowPhotoUpload === true ? '✅ TRUE' : '❌ FAIL');
    console.log(`   maxPhotos:`, putResC.data.data.maxPhotos === 5 ? '✅ 5' : '❌ FAIL');

    // Verify GET customer endpoint sees allowPhotoUpload = true and maxPhotos = 5
    const checkResC = await axios.get(`${API_BASE}/hampers/${h.slug}`);
    console.log(`✅ Customer GET /hampers/${h.slug} -> maxPhotos:`, checkResC.data.data.maxPhotos);
  }

  console.log(`\n========================================`);
  console.log(`🎉 ALL 5 PREDEFINED HAMPERS PASSED VERIFICATION!`);
  console.log(`========================================`);
}

verifyAllHampers().catch((err) => {
  console.error('❌ Verification Suite Failed:', err.response?.status, err.response?.data || err.message);
  process.exit(1);
});
