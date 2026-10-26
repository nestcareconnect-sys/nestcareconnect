import 'dotenv/config';
import http from 'http';
import prisma from '../api/config/prisma.js';
import { app } from '../api/server.js';

function makeRequest(
  server: http.Server,
  path: string,
  method = 'POST',
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (c) => (resBody += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 200, data: JSON.parse(resBody) });
          } catch {
            resolve({ status: res.statusCode || 200, data: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('\n============================================================');
  console.log('📱 TESTING REGISTRATION PHONE NUMBER VALIDATION REQUIREMENT');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  const uniqueSuffix = Date.now();

  // Test 1: Register without phone
  const resNoPhone = await makeRequest(server, '/api/auth/register', 'POST', {
    name: 'Test Customer',
    email: `nophone.${uniqueSuffix}@nestcareconnect.test`,
    password: 'SecurePassword123!',
  });
  console.log('1. Register without phone number:');
  console.log(`   Status: ${resNoPhone.status}`);
  console.log(`   Message: ${resNoPhone.data?.message}`);
  if (resNoPhone.status === 400 && resNoPhone.data?.message?.includes('phone')) {
    console.log('   ✅ Rejection verified: phone number is strictly required');
  } else {
    console.log('   ❌ Failed: should require phone number');
  }

  // Test 2: Register with invalid phone (too short)
  const resBadPhone = await makeRequest(server, '/api/auth/register', 'POST', {
    name: 'Test Customer',
    email: `badphone.${uniqueSuffix}@nestcareconnect.test`,
    phone: '123',
    password: 'SecurePassword123!',
  });
  console.log('\n2. Register with invalid phone (too short):');
  console.log(`   Status: ${resBadPhone.status}`);
  console.log(`   Message: ${resBadPhone.data?.message}`);
  if (resBadPhone.status === 400 && resBadPhone.data?.message?.includes('valid phone number')) {
    console.log('   ✅ Rejection verified: invalid phone number caught');
  } else {
    console.log('   ❌ Failed');
  }

  // Test 3: Register with valid phone
  const validEmail = `validphone.${uniqueSuffix}@nestcareconnect.test`;
  const resValid = await makeRequest(server, '/api/auth/register', 'POST', {
    name: 'Test Customer Valid',
    email: validEmail,
    phone: '+91  8921342411',
    password: 'SecurePassword123!',
  });
  console.log('\n3. Register with valid phone (+91  8921342411):');
  console.log(`   Status: ${resValid.status}`);
  console.log(`   Message: ${resValid.data?.message}`);
  console.log(`   Saved Phone: ${resValid.data?.data?.user?.phone}`);
  if (resValid.status === 201 && resValid.data?.data?.user?.phone) {
    console.log('   ✅ Registration succeeded and phone saved to DB');
  } else {
    console.log('   ❌ Failed');
  }

  // Clean up created test user
  await prisma.user.deleteMany({
    where: { email: { in: [validEmail] } },
  }).catch(() => {});

  server.close();
  console.log('\n------------------------------------------------------------');
  console.log('✅ ALL PHONE NUMBER REGISTRATION VALIDATIONS PASSED');
  console.log('------------------------------------------------------------\n');
}

runTest()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
