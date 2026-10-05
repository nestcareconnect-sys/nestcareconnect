import fs from 'fs';
import { INITIAL_HERO_SLIDES, INITIAL_PRODUCTS, INITIAL_HAMPERS, INITIAL_CATEGORIES, INITIAL_HAMPER_BOXES } from '../src/constants/index.js';

const db = JSON.parse(fs.readFileSync('./scripts/db_dump.json', 'utf8'));

// 1. Sync Hero Slides
const updatedHeroSlides = INITIAL_HERO_SLIDES.map((slide) => {
  const dbSlide = db.heroSlides.find((s: any) => s.id === slide.id);
  if (dbSlide) {
    return {
      ...slide,
      title: dbSlide.title || slide.title,
      subtitle: dbSlide.subtitle || slide.subtitle,
      badge: dbSlide.badge !== undefined ? dbSlide.badge : slide.badge,
      ctaText: dbSlide.ctaText || slide.ctaText,
      ctaUrl: dbSlide.ctaUrl || slide.ctaUrl,
      desktopImage: dbSlide.desktopImage || slide.desktopImage,
      mobileImage: dbSlide.mobileImage || slide.mobileImage,
      displayOrder: dbSlide.displayOrder !== undefined ? dbSlide.displayOrder : slide.displayOrder,
      status: dbSlide.status || slide.status,
    };
  }
  return slide;
});

// 2. Sync Products
const updatedProducts = INITIAL_PRODUCTS.map((product) => {
  const dbProd = db.products.find((p: any) => p.id === product.id || p.slug === product.slug);
  if (dbProd) {
    return {
      ...product,
      images: dbProd.images && dbProd.images.length > 0 ? dbProd.images : product.images,
    };
  }
  return product;
});

// 3. Sync Hampers
const updatedHampers = INITIAL_HAMPERS.map((hamper) => {
  const dbHamper = db.hampers.find((h: any) => h.id === hamper.id || h.slug === hamper.slug);
  if (dbHamper) {
    return {
      ...hamper,
      images: dbHamper.images && dbHamper.images.length > 0 ? dbHamper.images : hamper.images,
    };
  }
  return hamper;
});

// 4. Sync Categories
const updatedCategories = INITIAL_CATEGORIES.map((category) => {
  const dbCat = db.categories.find((c: any) => c.id === category.id || c.slug === category.slug);
  if (dbCat && dbCat.image) {
    return {
      ...category,
      image: dbCat.image,
    };
  }
  return category;
});

// 5. Sync Boxes
const updatedBoxes = INITIAL_HAMPER_BOXES.map((box) => {
  const dbBox = db.boxes.find((b: any) => b.id === box.id || b.slug === box.slug);
  if (dbBox && dbBox.images && dbBox.images.length > 0) {
    return {
      ...box,
      images: dbBox.images,
    };
  }
  return box;
});

fs.writeFileSync('./scripts/synced_constants.json', JSON.stringify({
  heroSlides: updatedHeroSlides,
  products: updatedProducts,
  hampers: updatedHampers,
  categories: updatedCategories,
  boxes: updatedBoxes,
}, null, 2));

console.log('✅ Generated synced constants JSON');
