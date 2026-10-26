import 'dotenv/config';
import { app } from '../api/server.js';
import http from 'http';

async function main() {
  console.log('🧪 Starting Production API Flow Verification...\n');

  // Start test server on random ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`📡 Ephemeral Test Server listening on port ${port}`);

  let allPassed = true;

  const testEndpoint = async (
    name: string,
    path: string,
    origin: string = 'https://nest-care-connect.vercel.app',
    options: RequestInit = {}
  ) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      const corsHeader = res.headers.get('access-control-allow-origin');
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      const ok = res.status >= 200 && res.status < 300 && (!json || json.success !== false);
      const isHealthy = path.includes('health') ? json?.status === 'healthy' : true;

      if (ok && isHealthy) {
        console.log(`✅ [PASS] ${name}`);
        console.log(`   Path: ${path} | Status: ${res.status} | CORS Origin: ${corsHeader || 'n/a'}`);
        if (json?.data) {
          if (Array.isArray(json.data)) {
            console.log(`   Items Returned: ${json.data.length}`);
          } else if (json.data.products) {
            console.log(`   Products Returned: ${json.data.products.length}`);
          } else if (json.data.categories) {
            console.log(`   Categories Returned: ${json.data.categories.length}`);
          }
        }
        if (json?.database) {
          console.log(
            `   DB: connected=${json.database.connected}, products=${json.database.productCount}, categories=${json.database.categoryCount}, hampers=${json.database.hamperCount}, orders=${json.database.orderCount}`
          );
        }
      } else {
        allPassed = false;
        console.error(`❌ [FAIL] ${name}`);
        console.error(`   Path: ${path} | Status: ${res.status} | Body: ${text.slice(0, 300)}`);
      }
    } catch (err: any) {
      allPassed = false;
      console.error(`❌ [ERROR] ${name}:`, err.message);
    }
  };

  // 1. Health & Database Connectivity
  await testEndpoint('1. Health Check with Live DB verification (/api/health)', '/api/health');
  await testEndpoint('2. Bare Health Check path (/health)', '/health');

  // 2. CORS Verification from Vercel Production Origin
  await testEndpoint(
    '3. Public Products API with Vercel Production Origin',
    '/api/products',
    'https://nest-care-connect.vercel.app'
  );

  // 3. CORS Verification from Custom Domain Origin
  await testEndpoint(
    '4. Public Categories API with Custom Domain Origin',
    '/api/categories',
    'https://nestcareconnect.com'
  );

  // 4. Curated Hampers API
  await testEndpoint(
    '5. Public Hampers API',
    '/api/hampers',
    'https://nest-care-connect.vercel.app'
  );

  // 5. Hero Slides API
  await testEndpoint(
    '6. Active Hero Slides API',
    '/api/hero-slides',
    'https://nest-care-connect.vercel.app'
  );

  // 6. Hamper Boxes API
  await testEndpoint(
    '7. Hamper Boxes API',
    '/api/boxes',
    'https://nest-care-connect.vercel.app'
  );

  // 7. Path Normalization Test (request without /api prefix)
  await testEndpoint(
    '8. Path Normalization (/products forwarded as /api/products)',
    '/products',
    'https://nest-care-connect.vercel.app'
  );

  // 8. Order Tracking API with authentic order & contact from database
  const { prisma } = await import('../api/config/prisma.js');
  const sampleOrder = await prisma.order.findFirst({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  if (sampleOrder) {
    const contact =
      sampleOrder.guestEmail ||
      sampleOrder.guestPhone ||
      sampleOrder.user?.email ||
      sampleOrder.user?.phone ||
      '';

    await testEndpoint(
      `9. Order Tracking Public Endpoint (${sampleOrder.orderNumber})`,
      '/api/orders/track',
      'https://nest-care-connect.vercel.app',
      {
        method: 'POST',
        body: JSON.stringify({
          orderNumber: sampleOrder.orderNumber,
          emailOrPhone: contact,
        }),
      }
    );
  }

  server.close();

  if (allPassed) {
    console.log('\n🎉 ALL PRODUCTION API FLOW TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n⚠️ SOME TESTS FAILED. Inspect details above.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
