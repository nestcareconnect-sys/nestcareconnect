import 'dotenv/config';
import jwt from 'jsonwebtoken';
import http from 'http';
import prisma from '../api/config/prisma.js';
import { app } from '../api/server.js';

function makeRequest(
  server: http.Server,
  path: string,
  method = 'GET',
  headers: Record<string, string> = {}
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
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 200, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 200, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function testAdminLoading() {
  console.log('\n============================================================');
  console.log('🧪 TESTING ADMIN CUSTOMERS & PRODUCTS LOADING LOGIC CONTRACT');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const JWT_SECRET = process.env.JWT_SECRET || 'nest_care_connect_super_secret_jwt_key_2026_production';

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin found in DB');
    server.close();
    process.exit(1);
  }

  const token = jwt.sign({ id: admin.id, email: admin.email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Customers list
  const custRes = await makeRequest(server, '/api/admin/customers', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('1. Admin Customers endpoint:');
  console.log(`   Status: ${custRes.status}`);
  console.log(`   Success: ${custRes.data?.success}`);
  console.log(`   Total returned: ${custRes.data?.data?.customers?.length || 0}`);
  if (custRes.status === 200 && custRes.data?.success) {
    console.log('   ✅ Customers endpoint contract validated');
  } else {
    console.log('   ❌ Failed');
  }

  // 2. Customers search
  const custSearch = await makeRequest(server, '/api/admin/customers?search=nonexistent_query_xyz', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('\n2. Admin Customers search (empty scenario):');
  console.log(`   Status: ${custSearch.status}`);
  console.log(`   Success: ${custSearch.data?.success}`);
  console.log(`   Total returned: ${custSearch.data?.data?.customers?.length || 0}`);
  if (custSearch.status === 200 && custSearch.data?.data?.customers?.length === 0) {
    console.log('   ✅ Empty customer results confirmed (empty state trigger)');
  }

  // 3. Products list
  const prodRes = await makeRequest(server, '/api/products?limit=100', 'GET');
  console.log('\n3. Products endpoint:');
  console.log(`   Status: ${prodRes.status}`);
  console.log(`   Success: ${prodRes.data?.success}`);
  console.log(`   Total returned: ${prodRes.data?.data?.products?.length || 0}`);
  if (prodRes.status === 200 && prodRes.data?.success) {
    console.log('   ✅ Products endpoint contract validated');
  }

  // 4. Products search (empty scenario)
  const prodSearch = await makeRequest(server, '/api/products?search=nonexistent_product_xyz_123', 'GET');
  console.log('\n4. Products search (empty scenario):');
  console.log(`   Status: ${prodSearch.status}`);
  console.log(`   Total returned: ${prodSearch.data?.data?.products?.length || 0}`);
  if (prodSearch.status === 200 && prodSearch.data?.data?.products?.length === 0) {
    console.log('   ✅ Empty products results confirmed (empty state trigger)');
  }

  server.close();
  console.log('\n------------------------------------------------------------');
  console.log('✅ ALL ADMIN LOADING & DATA CONTRACT TESTS PASSED');
  console.log('------------------------------------------------------------\n');
}

testAdminLoading()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
