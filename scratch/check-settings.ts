import prisma from '../api/config/prisma.js';

async function checkSettings() {
  try {
    const settings = await prisma.siteSetting.findMany();
    console.log('SiteSettings count:', settings.length);
    console.log('SiteSettings keys:', settings.map((s: any) => s.key));
    for (const s of settings) {
      console.log(`Setting [${s.key}]:`, JSON.stringify(s.value, null, 2));
    }

    const shippingRules = await prisma.shippingRule.findMany();
    console.log('ShippingRules count:', shippingRules.length);
    for (const r of shippingRules) {
      console.log(`ShippingRule [${r.country}]: fee=${r.shippingFee}, threshold=${r.freeShippingThreshold}`);
    }
  } catch (err: any) {
    console.error('Error querying settings:', err.message);
  } finally {
    if (prisma.$disconnect) await prisma.$disconnect();
  }
}

checkSettings();
