import { PrismaClient, Role, Status, HamperType, PricingType, CountryCode, CurrencyCode, DiscountType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_HAMPERS,
  INITIAL_HERO_SLIDES,
  INITIAL_SHIPPING_RULES,
  INITIAL_COUPONS,
  INITIAL_HAMPER_BOXES,
} from '../api/config/constants.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Nest Care Connect database seed...');

  // 1. Seed Currencies & Exchange rates
  console.log('Seeding Currencies & Exchange Rates...');
  await prisma.currency.upsert({
    where: { code: CurrencyCode.INR },
    update: {},
    create: { code: CurrencyCode.INR, name: 'Indian Rupee', symbol: '₹', isBase: true },
  });
  await prisma.currency.upsert({
    where: { code: CurrencyCode.AED },
    update: {},
    create: { code: CurrencyCode.AED, name: 'UAE Dirham', symbol: 'AED', isBase: false },
  });
  await prisma.currency.upsert({
    where: { code: CurrencyCode.USD },
    update: {},
    create: { code: CurrencyCode.USD, name: 'US Dollar', symbol: '$', isBase: false },
  });

  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: CurrencyCode.INR, toCurrency: CurrencyCode.AED } },
    update: { rate: 0.044 },
    create: { fromCurrency: CurrencyCode.INR, toCurrency: CurrencyCode.AED, rate: 0.044 },
  });
  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: CurrencyCode.INR, toCurrency: CurrencyCode.USD } },
    update: { rate: 0.012 },
    create: { fromCurrency: CurrencyCode.INR, toCurrency: CurrencyCode.USD, rate: 0.012 },
  });

  // 2. Seed Admin and Demo User
  console.log('Seeding Admin and Customer Accounts...');
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const userPasswordHash = await bcrypt.hash('User@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nestcareconnect.com' },
    update: { role: Role.ADMIN },
    create: {
      email: 'admin@nestcareconnect.com',
      name: 'Dr. Sarah Mathews (Admin)',
      passwordHash,
      role: Role.ADMIN,
      phone: '+919876543210',
      status: Status.ACTIVE,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'customer@nestcareconnect.com' },
    update: {},
    create: {
      email: 'customer@nestcareconnect.com',
      name: 'Rajesh Sharma',
      passwordHash: userPasswordHash,
      role: Role.CUSTOMER,
      phone: '+919898989898',
      status: Status.ACTIVE,
    },
  });

  // Demo Address for Customer
  await prisma.address.createMany({
    data: [
      {
        userId: demoUser.id,
        type: 'SHIPPING',
        name: 'Rajesh Sharma',
        phone: '+919898989898',
        addressLine1: '402, Green Meadows, 5th Main',
        addressLine2: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: CountryCode.IN,
        isDefault: true,
      },
    ],
    skipDuplicates: true,
  });

  // 3. Seed Hierarchical Categories (recursive support)
  console.log('Seeding Categories...');
  for (const rootCat of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: rootCat.slug },
      update: {
        name: rootCat.name,
        description: rootCat.description,
        image: rootCat.image,
        icon: (rootCat as any).icon || null,
        type: (rootCat as any).type || null,
      },
      create: {
        id: rootCat.id,
        name: rootCat.name,
        slug: rootCat.slug,
        description: rootCat.description,
        image: rootCat.image,
        icon: (rootCat as any).icon || null,
        type: (rootCat as any).type || null,
        sortOrder: rootCat.sortOrder,
        status: Status.ACTIVE,
      },
    });

    if (rootCat.children) {
      for (const subCat of rootCat.children) {
        await prisma.category.upsert({
          where: { slug: subCat.slug },
          update: {
            parentCategoryId: rootCat.id,
            name: subCat.name,
            description: subCat.description,
            image: subCat.image,
            icon: (subCat as any).icon || null,
            type: (subCat as any).type || null,
          },
          create: {
            id: subCat.id,
            name: subCat.name,
            slug: subCat.slug,
            description: subCat.description,
            image: subCat.image,
            icon: (subCat as any).icon || null,
            type: (subCat as any).type || null,
            parentCategoryId: rootCat.id,
            sortOrder: subCat.sortOrder,
            status: Status.ACTIVE,
          },
        });

        if ((subCat as any).children) {
          for (const subSubCat of (subCat as any).children) {
            await prisma.category.upsert({
              where: { slug: subSubCat.slug },
              update: {
                parentCategoryId: subCat.id,
                name: subSubCat.name,
                description: subSubCat.description,
                image: subSubCat.image,
                icon: (subSubCat as any).icon || null,
                type: (subSubCat as any).type || null,
              },
              create: {
                id: subSubCat.id,
                name: subSubCat.name,
                slug: subSubCat.slug,
                description: subSubCat.description,
                image: subSubCat.image,
                icon: (subSubCat as any).icon || null,
                type: (subSubCat as any).type || null,
                parentCategoryId: subCat.id,
                sortOrder: subSubCat.sortOrder,
                status: Status.ACTIVE,
              },
            });
          }
        }
      }
    }
  }

  // 4. Seed Products
  console.log('Seeding Products and Country Overrides...');
  for (const prod of INITIAL_PRODUCTS) {
    const { countryPrices, ...prodData } = prod;
    await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: {
        name: prodData.name,
        sku: prodData.sku,
        description: prodData.description,
        shortDescription: prodData.shortDescription,
        images: prodData.images,
        basePriceINR: prodData.basePriceINR,
        compareAtPriceINR: prodData.compareAtPriceINR,
        stock: prodData.stock,
        categoryId: prodData.categoryId,
        brand: prodData.brand,
        unit: prodData.unit,
        weight: prodData.weight,
        status: Status.ACTIVE,
        featured: prodData.featured,
        isAddOn: (prodData as any).isAddOn || false,
        addOnCategory: (prodData as any).addOnCategory || null,
        isCustomHamperEligible: (prodData as any).isCustomHamperEligible ?? true,
        tags: prodData.tags,
        specifications: prodData.specifications,
      },
      create: {
        id: prodData.id,
        name: prodData.name,
        slug: prodData.slug,
        sku: prodData.sku,
        description: prodData.description,
        shortDescription: prodData.shortDescription,
        images: prodData.images,
        basePriceINR: prodData.basePriceINR,
        compareAtPriceINR: prodData.compareAtPriceINR,
        stock: prodData.stock,
        categoryId: prodData.categoryId,
        brand: prodData.brand,
        unit: prodData.unit,
        weight: prodData.weight,
        status: Status.ACTIVE,
        featured: prodData.featured,
        isAddOn: (prodData as any).isAddOn || false,
        addOnCategory: (prodData as any).addOnCategory || null,
        isCustomHamperEligible: (prodData as any).isCustomHamperEligible ?? true,
        tags: prodData.tags,
        specifications: prodData.specifications,
      },
    });

    if (countryPrices) {
      for (const cp of countryPrices) {
        await prisma.productCountryPrice.upsert({
          where: { productId_country: { productId: prodData.id, country: cp.country as CountryCode } },
          update: { fixedPrice: cp.fixedPrice, currency: cp.currency as CurrencyCode },
          create: {
            productId: prodData.id,
            country: cp.country as CountryCode,
            currency: cp.currency as CurrencyCode,
            fixedPrice: cp.fixedPrice,
          },
        });
      }
    }
  }

  // 5. Seed Hampers
  console.log('Seeding Predefined Hampers...');
  for (const h of INITIAL_HAMPERS) {
    const { items, countryPrices, ...hamperData } = h;
    await prisma.hamper.upsert({
      where: { slug: hamperData.slug },
      update: {
        name: hamperData.name,
        hamperType: hamperData.hamperType as HamperType,
        recipientType: (hamperData as any).recipientType || null,
        occasion: (hamperData as any).occasion || null,
        recipientVariant: (hamperData as any).recipientVariant || null,
        description: hamperData.description,
        shortDescription: hamperData.shortDescription,
        images: hamperData.images,
        pricingType: hamperData.pricingType as PricingType,
        fixedPriceINR: hamperData.fixedPriceINR,
        startingPriceINR: (hamperData as any).startingPriceINR || hamperData.fixedPriceINR || null,
        stock: hamperData.stock,
        featured: hamperData.featured,
        allowCustomMessage: (hamperData as any).allowCustomMessage ?? true,
        allowPhotos: (hamperData as any).allowPhotos ?? true,
        allowPhotoUpload: (hamperData as any).allowPhotoUpload ?? (hamperData as any).allowPhotos ?? true,
        maxPhotos: (hamperData as any).maxPhotos ?? 3,
        photoRequired: (hamperData as any).photoRequired ?? false,
        photoInstructions: (hamperData as any).photoInstructions || 'Add a special family photo to include inside the hamper greeting card.',
        photoCardEnabled: (hamperData as any).photoCardEnabled ?? true,
        allowVideoQR: (hamperData as any).allowVideoQR ?? false,
        countryAvailability: hamperData.countryAvailability as CountryCode[],
        status: Status.ACTIVE,
      },
      create: {
        id: hamperData.id,
        name: hamperData.name,
        slug: hamperData.slug,
        hamperType: hamperData.hamperType as HamperType,
        recipientType: (hamperData as any).recipientType || null,
        occasion: (hamperData as any).occasion || null,
        recipientVariant: (hamperData as any).recipientVariant || null,
        description: hamperData.description,
        shortDescription: hamperData.shortDescription,
        images: hamperData.images,
        pricingType: hamperData.pricingType as PricingType,
        fixedPriceINR: hamperData.fixedPriceINR,
        startingPriceINR: (hamperData as any).startingPriceINR || hamperData.fixedPriceINR || null,
        stock: hamperData.stock,
        featured: hamperData.featured,
        allowCustomMessage: (hamperData as any).allowCustomMessage ?? true,
        allowPhotos: (hamperData as any).allowPhotos ?? true,
        allowPhotoUpload: (hamperData as any).allowPhotoUpload ?? (hamperData as any).allowPhotos ?? true,
        maxPhotos: (hamperData as any).maxPhotos ?? 3,
        photoRequired: (hamperData as any).photoRequired ?? false,
        photoInstructions: (hamperData as any).photoInstructions || 'Add a special family photo to include inside the hamper greeting card.',
        photoCardEnabled: (hamperData as any).photoCardEnabled ?? true,
        allowVideoQR: (hamperData as any).allowVideoQR ?? false,
        countryAvailability: hamperData.countryAvailability as CountryCode[],
        status: Status.ACTIVE,
      },
    });

    // Seed hamper items
    if (items) {
      for (const itm of items) {
        await prisma.hamperItem.upsert({
          where: { hamperId_productId: { hamperId: hamperData.id, productId: itm.productId } },
          update: { quantity: itm.quantity },
          create: {
            hamperId: hamperData.id,
            productId: itm.productId,
            quantity: itm.quantity,
          },
        });
      }
    }

    if (countryPrices) {
      for (const cp of countryPrices) {
        await prisma.hamperCountryPrice.upsert({
          where: { hamperId_country: { hamperId: hamperData.id, country: cp.country as CountryCode } },
          update: { fixedPrice: cp.fixedPrice, currency: cp.currency as CurrencyCode },
          create: {
            hamperId: hamperData.id,
            country: cp.country as CountryCode,
            currency: cp.currency as CurrencyCode,
            fixedPrice: cp.fixedPrice,
          },
        });
      }
    }
  }

  // 6. Seed Custom Hamper Configuration
  console.log('Seeding Custom Hamper Configuration...');
  const existingConfig = await prisma.customHamperConfig.findFirst();
  if (!existingConfig) {
    await prisma.customHamperConfig.create({
      data: {
        title: 'Build Your Custom Healthcare Hamper',
        description: 'Select your preferred health monitors, diabetic supplies, and wellness delicacies to assemble a customized gift or care bundle.',
        minItems: 2,
        maxItems: 12,
        minPriceINR: 500,
        allowedCountries: [CountryCode.IN, CountryCode.AE, CountryCode.US],
        active: true,
      },
    });
  }

  // 7. Seed Hero Slides
  console.log('Seeding Hero Slides...');
  for (const slide of INITIAL_HERO_SLIDES) {
    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: slide as any,
      create: slide as any,
    });
  }

  // 8. Seed Shipping Rules
  console.log('Seeding Shipping Rules...');
  for (const rule of INITIAL_SHIPPING_RULES) {
    await prisma.shippingRule.upsert({
      where: { country: rule.country as CountryCode },
      update: rule as any,
      create: rule as any,
    });
  }

  // 9. Seed Coupons
  console.log('Seeding Coupons...');
  for (const c of INITIAL_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        discountType: c.discountType as DiscountType,
        discountValue: c.discountValue,
        minOrderValueINR: c.minOrderValueINR,
        maxDiscountINR: c.maxDiscountINR,
        usageLimit: c.usageLimit,
        applicableCountries: c.applicableCountries as CountryCode[],
        active: c.active,
      },
      create: {
        id: c.id,
        code: c.code,
        discountType: c.discountType as DiscountType,
        discountValue: c.discountValue,
        minOrderValueINR: c.minOrderValueINR,
        maxDiscountINR: c.maxDiscountINR,
        usageLimit: c.usageLimit,
        applicableCountries: c.applicableCountries as CountryCode[],
        active: c.active,
      },
    });
  }

  // 10. Seed Hamper Boxes
  console.log('Seeding Hamper Boxes...');
  for (const box of INITIAL_HAMPER_BOXES) {
    const createdBox = await prisma.hamperBox.upsert({
      where: { slug: box.slug },
      update: {
        name: box.name,
        description: box.description,
        size: box.size,
        color: box.color,
        material: box.material,
        dimensions: box.dimensions,
        length: box.length,
        width: box.width,
        height: box.height,
        capacity: box.capacity,
        maxWeight: box.maxWeight,
        basePriceINR: box.basePriceINR,
        compareAtPriceINR: box.compareAtPriceINR,
        stock: box.stock,
        status: box.status as Status,
        sortOrder: box.sortOrder,
        isRecommended: box.isRecommended,
        images: box.images,
        countryAvailability: box.countryAvailability as CountryCode[],
      },
      create: {
        id: box.id,
        name: box.name,
        slug: box.slug,
        description: box.description,
        size: box.size,
        color: box.color,
        material: box.material,
        dimensions: box.dimensions,
        length: box.length,
        width: box.width,
        height: box.height,
        capacity: box.capacity,
        maxWeight: box.maxWeight,
        basePriceINR: box.basePriceINR,
        compareAtPriceINR: box.compareAtPriceINR,
        stock: box.stock,
        status: box.status as Status,
        sortOrder: box.sortOrder,
        isRecommended: box.isRecommended,
        images: box.images,
        countryAvailability: box.countryAvailability as CountryCode[],
      },
    });

    if (box.countryPrices) {
      for (const cp of box.countryPrices) {
        await prisma.hamperBoxCountryPrice.upsert({
          where: {
            boxId_country: {
              boxId: createdBox.id,
              country: cp.country as CountryCode,
            },
          },
          update: {
            fixedPrice: cp.fixedPrice,
            currency: cp.currency as CurrencyCode,
          },
          create: {
            boxId: createdBox.id,
            country: cp.country as CountryCode,
            currency: cp.currency as CurrencyCode,
            fixedPrice: cp.fixedPrice,
          },
        });
      }
    }
  }

  // 11. Seed Site Settings
  console.log('Seeding Site Settings...');
  await prisma.siteSetting.upsert({
    where: { key: 'general_settings' },
    update: {},
    create: {
      key: 'general_settings',
      value: {
        companyName: 'Nest Care Connect',
        contactEmail: 'support@nestcareconnect.com',
        contactPhone: '+91 800 123 4567',
        whatsappNumber: '+91 98765 43210',
        officeAddress: 'Nest Healthcare Hub, Level 4, Tech Enclave, Indiranagar, Bengaluru, 560038, India',
        supportedCountries: ['IN', 'AE', 'US'],
        supportedCurrencies: ['INR', 'AED', 'USD'],
        defaultCurrency: 'INR',
        freeShippingEnabled: true,
      },
    },
  });

  console.log('✅ Nest Care Connect database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
