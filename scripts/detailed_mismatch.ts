import fs from 'fs';
import { INITIAL_HERO_SLIDES, INITIAL_PRODUCTS, INITIAL_HAMPERS, INITIAL_CATEGORIES, INITIAL_HAMPER_BOXES } from '../src/constants/index.js';

const db = JSON.parse(fs.readFileSync('./scripts/db_dump.json', 'utf8'));

console.log('=== HERO SLIDES MISMATCHES ===');
for (const slide of db.heroSlides) {
  const c = INITIAL_HERO_SLIDES.find((s: any) => s.id === slide.id);
  if (c) {
    if (c.desktopImage !== slide.desktopImage || c.mobileImage !== slide.mobileImage) {
      console.log(`[SLIDE] ${slide.id} (${slide.title}):`);
      console.log(`  DB  Desktop: ${slide.desktopImage}`);
      console.log(`  SRC Desktop: ${c.desktopImage}`);
      console.log(`  DB  Mobile:  ${slide.mobileImage}`);
      console.log(`  SRC Mobile:  ${c.mobileImage}`);
    }
  }
}

console.log('\n=== PRODUCTS MISMATCHES ===');
for (const prod of db.products) {
  const c = INITIAL_PRODUCTS.find((p: any) => p.id === prod.id || p.slug === prod.slug);
  if (c) {
    if (JSON.stringify(c.images) !== JSON.stringify(prod.images)) {
      console.log(`[PRODUCT] ${prod.slug} (${prod.name}):`);
      console.log(`  DB : ${JSON.stringify(prod.images)}`);
      console.log(`  SRC: ${JSON.stringify(c.images)}`);
    }
  } else {
    console.log(`[PRODUCT MISSING IN SRC] ${prod.slug}`);
  }
}

console.log('\n=== HAMPERS MISMATCHES ===');
for (const hamper of db.hampers) {
  const c = INITIAL_HAMPERS.find((h: any) => h.id === hamper.id || h.slug === hamper.slug);
  if (c) {
    if (JSON.stringify(c.images) !== JSON.stringify(hamper.images)) {
      console.log(`[HAMPER] ${hamper.slug} (${hamper.name}):`);
      console.log(`  DB : ${JSON.stringify(hamper.images)}`);
      console.log(`  SRC: ${JSON.stringify(c.images)}`);
    }
  }
}

console.log('\n=== CATEGORIES MISMATCHES ===');
for (const cat of db.categories) {
  const c = INITIAL_CATEGORIES.find((k: any) => k.id === cat.id || k.slug === cat.slug);
  if (c) {
    if (c.image !== cat.image) {
      console.log(`[CATEGORY] ${cat.slug} (${cat.name}):`);
      console.log(`  DB : ${cat.image}`);
      console.log(`  SRC: ${c.image}`);
    }
  }
}
