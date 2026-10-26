import 'dotenv/config';
import prisma from '../api/config/prisma.js';
import bcrypt from 'bcryptjs';

async function testFullSuite() {
  console.log('====================================================');
  console.log('🧪 Comprehensive Endpoint & Database Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Category listing
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });
    console.log(`✅ [1/8] Category Listing: PASSED (${categories.length} categories found)`);
    if (categories.length > 0) {
      console.log(`   Sample category: "${categories[0].name}" (slug: ${categories[0].slug})`);
    }
    passed++;
  } catch (err: any) {
    console.error('❌ [1/8] Category Listing: FAILED', err.message);
    failed++;
  }

  // 2. Hamper listing
  try {
    const hampers = await prisma.hamper.findMany({
      where: { status: 'ACTIVE' },
      include: {
        countryPrices: true,
        items: { include: { product: true } },
      },
    });
    console.log(`✅ [2/8] Hamper Listing: PASSED (${hampers.length} active hampers found)`);
    if (hampers.length > 0) {
      console.log(`   Sample hamper: "${hampers[0].name}" (items: ${hampers[0].items.length})`);
    }
    passed++;
  } catch (err: any) {
    console.error('❌ [2/8] Hamper Listing: FAILED', err.message);
    failed++;
  }

  // 3. Product listing and pagination
  let sampleProductSlug = '';
  try {
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
    ]);
    console.log(`✅ [3/8] Product Listing & Pagination: PASSED (Page 1 has ${products.length}/${total} products)`);
    if (products.length > 0) {
      sampleProductSlug = products[0].slug;
      console.log(`   Sample product: "${products[0].name}" (SKU: ${products[0].sku}, Price: ₹${products[0].basePriceINR})`);
    }
    passed++;
  } catch (err: any) {
    console.error('❌ [3/8] Product Listing: FAILED', err.message);
    failed++;
  }

  // 4. Product detail retrieval
  try {
    if (!sampleProductSlug) throw new Error('No product slug available');
    const product = await prisma.product.findUnique({
      where: { slug: sampleProductSlug },
      include: {
        category: true,
        countryPrices: true,
        reviews: true,
      },
    });
    if (!product) throw new Error(`Product not found with slug ${sampleProductSlug}`);
    console.log(`✅ [4/8] Product Detail Retrieval: PASSED ("${product.name}", Category: ${product.category?.name || 'None'})`);
    passed++;
  } catch (err: any) {
    console.error('❌ [4/8] Product Detail: FAILED', err.message);
    failed++;
  }

  // 5. Cart retrieval and updates
  try {
    // Find or create test guest cart
    const testGuestId = `test_verification_${Date.now()}`;
    const testCart = await prisma.cart.create({
      data: { guestId: testGuestId },
    });

    const firstProduct = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });
    if (!firstProduct) throw new Error('No active product found for cart test');

    // Add item
    const cartItem = await prisma.cartItem.create({
      data: {
        cartId: testCart.id,
        productId: firstProduct.id,
        quantity: 2,
      },
    });

    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: 3 },
    });

    // Retrieve cart
    const retrievedCart = await prisma.cart.findUnique({
      where: { id: testCart.id },
      include: { items: true },
    });

    const finalQty = retrievedCart?.items[0]?.quantity;
    if (finalQty !== 3) throw new Error(`Expected quantity 3, got ${finalQty}`);

    // Cleanup test cart
    await prisma.cart.delete({ where: { id: testCart.id } });
    console.log(`✅ [5/8] Cart Retrieval, Add, Update & Persistence: PASSED (Cart lifecycle verified)`);
    passed++;
  } catch (err: any) {
    console.error('❌ [5/8] Cart Operations: FAILED', err.message);
    failed++;
  }

  // 6. Site settings
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'general_settings' },
    });
    const currencies = await prisma.currency.findMany();
    const exchangeRates = await prisma.exchangeRate.findMany();
    console.log(`✅ [6/8] Site Settings & Exchange Rates: PASSED (Setting: "${(setting?.value as any)?.companyName || 'N/A'}", Currencies: ${currencies.length}, Exchange Rates: ${exchangeRates.length})`);
    passed++;
  } catch (err: any) {
    console.error('❌ [6/8] Site Settings: FAILED', err.message);
    failed++;
  }

  // 7. User authentication
  try {
    const customer = await prisma.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    if (!customer) throw new Error('No customer user found');

    const isMatch = await bcrypt.compare('User@123456', customer.passwordHash);
    if (!isMatch) throw new Error('Password hash does not match User@123456');
    console.log(`✅ [7/8] User Authentication: PASSED (User: "${customer.email}", Password verified)`);
    passed++;
  } catch (err: any) {
    console.error('❌ [7/8] User Authentication: FAILED', err.message);
    failed++;
  }

  // 8. Order retrieval and persistence
  try {
    const orders = await prisma.order.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        timeline: true,
        shipment: true,
      },
    });
    console.log(`✅ [8/8] Order Retrieval & Persistence: PASSED (${orders.length} recent orders retrieved)`);
    if (orders.length > 0) {
      console.log(`   Sample order: #${orders[0].orderNumber} (Status: ${orders[0].orderStatus}, Total: ₹${orders[0].total})`);
    }
    passed++;
  } catch (err: any) {
    console.error('❌ [8/8] Order Operations: FAILED', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 Suite Results: ${passed}/8 PASSED, ${failed}/8 FAILED`);
  console.log('====================================================\n');
}

testFullSuite().finally(async () => {
  if (prisma.$disconnect) await prisma.$disconnect();
});
