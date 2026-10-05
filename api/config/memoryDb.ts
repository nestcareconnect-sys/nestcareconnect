import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_HAMPERS,
  INITIAL_HERO_SLIDES,
  INITIAL_SHIPPING_RULES,
  INITIAL_COUPONS,
} from './constants.js';

function uuid(): string {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

class MemoryDatabase {
  users: any[] = [];
  addresses: any[] = [];
  categories: any[] = [];
  products: any[] = [];
  productCountryPrices: any[] = [];
  hampers: any[] = [];
  hamperItems: any[] = [];
  hamperCountryPrices: any[] = [];
  _customHamperConfig: any = null;
  carts: any[] = [];
  cartItems: any[] = [];
  orders: any[] = [];
  orderItems: any[] = [];
  orderTimelines: any[] = [];
  payments: any[] = [];
  shipments: any[] = [];
  coupons: any[] = [];
  couponUsages: any[] = [];
  currencies: any[] = [];
  exchangeRates: any[] = [];
  shippingRules: any[] = [];
  heroSlides: any[] = [];
  reviews: any[] = [];
  wishlistItems: any[] = [];
  siteSettings: any[] = [];
  auditLogs: any[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // 1. Currencies & Exchange rates
    this.currencies = [
      { id: 'curr-inr', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'curr-aed', code: 'AED', name: 'UAE Dirham', symbol: 'AED', isBase: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'curr-usd', code: 'USD', name: 'US Dollar', symbol: '$', isBase: false, createdAt: new Date(), updatedAt: new Date() },
    ];

    this.exchangeRates = [
      { id: 'ex-inr-aed', fromCurrency: 'INR', toCurrency: 'AED', rate: 0.044, updatedAt: new Date() },
      { id: 'ex-inr-usd', fromCurrency: 'INR', toCurrency: 'USD', rate: 0.012, updatedAt: new Date() },
    ];

    // 2. Users
    const adminHash = bcrypt.hashSync('Admin@123456', 10);
    const userHash = bcrypt.hashSync('User@123456', 10);

    const adminUser = {
      id: 'usr-admin-001',
      email: 'admin@nestcareconnect.com',
      name: 'Dr. Sarah Mathews (Admin)',
      passwordHash: adminHash,
      role: 'ADMIN',
      phone: '+919876543210',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const demoCustomer = {
      id: 'usr-cust-001',
      email: 'customer@nestcareconnect.com',
      name: 'Rajesh Sharma',
      passwordHash: userHash,
      role: 'CUSTOMER',
      phone: '+14155552671',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users = [adminUser, demoCustomer];

    // Addresses
    this.addresses = [
      {
        id: 'addr-001',
        userId: 'usr-cust-001',
        type: 'SHIPPING',
        name: 'M. K. Sharma & Lakshmi Sharma',
        phone: '+919898989898',
        addressLine1: 'Flat 402, Green Meadows, 5th Main',
        addressLine2: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'IN',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 3. Categories
    for (const root of INITIAL_CATEGORIES) {
      this.categories.push({
        id: root.id,
        name: root.name,
        slug: root.slug,
        icon: root.icon || 'Activity',
        type: root.type || 'CARE',
        description: root.description,
        image: root.image,
        parentCategoryId: null,
        status: 'ACTIVE',
        sortOrder: root.sortOrder || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (root.children) {
        for (const sub of root.children) {
          this.categories.push({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            icon: sub.icon || 'Heart',
            type: sub.type || 'CARE',
            description: sub.description,
            image: sub.image,
            parentCategoryId: root.id,
            status: 'ACTIVE',
            sortOrder: sub.sortOrder || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // 4. Products
    for (const prod of INITIAL_PRODUCTS) {
      const { countryPrices, ...prodData } = prod;
      this.products.push({
        ...prodData,
        isAddOn: prodData.isAddOn ?? false,
        addOnCategory: prodData.addOnCategory ?? null,
        isCustomHamperEligible: prodData.isCustomHamperEligible ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (countryPrices) {
        for (const cp of countryPrices) {
          this.productCountryPrices.push({
            id: uuid(),
            productId: prodData.id,
            country: cp.country,
            currency: cp.currency,
            fixedPrice: cp.fixedPrice,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // 5. Hampers
    for (const h of INITIAL_HAMPERS) {
      const { items, countryPrices, ...hamperData } = h;
      this.hampers.push({
        ...hamperData,
        allowCustomMessage: hamperData.allowCustomMessage ?? true,
        allowPhotos: hamperData.allowPhotos ?? true,
        allowPhotoUpload: hamperData.allowPhotoUpload ?? hamperData.allowPhotos ?? true,
        maxPhotos: hamperData.maxPhotos ?? 3,
        photoRequired: hamperData.photoRequired ?? false,
        photoInstructions: hamperData.photoInstructions ?? 'Add a special family photo to include inside the hamper greeting card.',
        photoCardEnabled: hamperData.photoCardEnabled ?? true,
        allowVideoQR: hamperData.allowVideoQR ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (items) {
        for (const itm of items) {
          this.hamperItems.push({
            id: uuid(),
            hamperId: hamperData.id,
            productId: itm.productId,
            quantity: itm.quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (countryPrices) {
        for (const cp of countryPrices) {
          this.hamperCountryPrices.push({
            id: uuid(),
            hamperId: hamperData.id,
            country: cp.country,
            currency: cp.currency,
            fixedPrice: cp.fixedPrice,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // 6. Custom Hamper Config
    this._customHamperConfig = {
      id: 'cfg-custom-hamper',
      title: 'Build Your Custom Healthcare & Care Hamper',
      description: 'Select your preferred medical monitors, traditional Kerala attire, florals, treats, and message cards to assemble a bespoke gift.',
      minItems: 2,
      maxItems: 15,
      minPriceINR: 500,
      allowedCategoryIds: [],
      allowedProductIds: [],
      allowedCountries: ['IN', 'AE', 'US'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 7. Hero Slides
    this.heroSlides = INITIAL_HERO_SLIDES.map((s) => ({
      ...s,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // 8. Shipping Rules
    this.shippingRules = INITIAL_SHIPPING_RULES.map((r) => ({
      ...r,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // 9. Coupons
    this.coupons = INITIAL_COUPONS.map((c) => ({
      ...c,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // 10. Site Settings
    this.siteSettings = [
      {
        id: 'set-general',
        key: 'general_settings',
        value: {
          companyName: 'Nest Care Connect',
          brandTagline: 'Helping families living overseas care for their parents back home.',
          contactEmail: 'support@nestcareconnect.com',
          contactPhone: '+91 800 123 4567',
          whatsappNumber: '+91 98765 43210',
          officeAddress: 'Nest Healthcare Hub, Level 4, Tech Enclave, Indiranagar, Bengaluru, 560038, India',
          supportedCountries: ['IN', 'AE', 'US'],
          supportedCurrencies: ['INR', 'AED', 'USD'],
          defaultCurrency: 'INR',
          freeShippingEnabled: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 11. Initial Sample Orders (including a Personalised Video demo order)
    const demoToken = 'demo-love-video-2026';
    const sampleOrder = {
      id: 'ord-sample-001',
      orderNumber: 'NCC-2026-98102',
      userId: 'usr-cust-001',
      buyer: {
        name: 'Rajesh Sharma',
        email: 'customer@nestcareconnect.com',
        phone: '+14155552671',
        country: 'US',
      },
      recipient: {
        name: 'M. K. Sharma & Lakshmi Sharma',
        phone: '+919898989898',
        relationship: 'Parents (Mum & Dad)',
        addressLine1: 'Flat 402, Green Meadows, 5th Main',
        addressLine2: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'IN',
      },
      buyerCountry: 'US',
      buyerCurrency: 'USD',
      deliveryCountry: 'IN',
      deliveryCurrency: 'INR',
      subtotal: 99.99,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: 99.99,
      currency: 'USD',
      paymentStatus: 'PAID',
      orderStatus: 'PACKED',
      paymentProvider: 'STRIPE',
      paymentId: 'ch_test_3P92kL291932',
      videoSecureToken: demoToken,
      videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', // Sample uplifting family greeting video
      videoStatus: 'VIDEO_READY',
      personalizationNote: 'Happy 45th Anniversary Mum & Dad! We miss you so much and cannot wait to visit home soon. With all our love from California   - Rajesh & Ananya',
      uploadedPhotos: [
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80',
      ],
      trackingNumber: 'DTDC-BLR-892019',
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    };

    this.orders.push(sampleOrder);

    this.orderItems.push({
      id: uuid(),
      orderId: sampleOrder.id,
      itemType: 'HAMPER',
      hamperId: 'hamper-premium-care',
      name: 'Premium Care Hamper',
      unitPrice: 99.99,
      quantity: 1,
      totalPrice: 99.99,
      personalization: {
        customMessage: sampleOrder.personalizationNote,
        photos: sampleOrder.uploadedPhotos,
        videoSecureToken: demoToken,
        videoUrl: sampleOrder.videoUrl,
        videoStatus: 'VIDEO_READY',
      },
      snapshot: {
        hamperName: 'Premium Care Hamper',
        constituentItems: [
          'Omron Automatic BP Monitor',
          'AccuCheck Glucometer & 100 Strips',
          'AccuTemp Infrared Thermometer',
          '7-Day Pill Organiser Box',
          'Luxury Egyptian Cotton Bath Towel',
          'Wayanad Artisanal Arabica Coffee',
          'Gourmet Roasted Cashews 250g',
          'Fresh Keepsake Floral Posy',
          'Personalised Family Video QR Greeting Card',
        ],
      },
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    });

    this.orderTimelines.push(
      { id: uuid(), orderId: sampleOrder.id, status: 'CONFIRMED', title: 'Order Confirmed', description: 'Payment verified from USA via Stripe ($99.99 USD).', createdAt: new Date(Date.now() - 86400000) },
      { id: uuid(), orderId: sampleOrder.id, status: 'PROCESSING', title: 'Hamper Preparation & Video QR Generated', description: 'Personalised greeting card printed with QR code to special message page.', createdAt: new Date(Date.now() - 43200000) },
      { id: uuid(), orderId: sampleOrder.id, status: 'PACKED', title: 'Packed & Quality Verified', description: 'Hamper hand-tied with satin ribbon and ready for Bengaluru dispatch.', createdAt: new Date(Date.now() - 21600000) }
    );
  }

  // Model accessors
  get user() {
    return {
      findUnique: async ({ where }: any) => {
        if (where.id) return this.users.find((u) => u.id === where.id) || null;
        if (where.email) return this.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
        return null;
      },
      findFirst: async ({ where }: any = {}) => {
        if (!where) return this.users[0] || null;
        return this.users.find((u) => (!where.email || u.email.toLowerCase() === where.email.toLowerCase()) && (!where.role || u.role === where.role)) || null;
      },
      findMany: async ({ where, skip = 0, take }: any = {}) => {
        let list = [...this.users];
        if (where?.role) list = list.filter((u) => u.role === where.role);
        if (take) return list.slice(skip, skip + take);
        return list;
      },
      count: async ({ where }: any = {}) => {
        let list = [...this.users];
        if (where?.role) list = list.filter((u) => u.role === where.role);
        return list.length;
      },
      create: async ({ data }: any) => {
        const newUser = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.users.push(newUser);
        return newUser;
      },
      update: async ({ where, data }: any) => {
        const idx = this.users.findIndex((u) => (where.id && u.id === where.id) || (where.email && u.email.toLowerCase() === where.email.toLowerCase()));
        if (idx === -1) throw new Error('User not found');
        this.users[idx] = { ...this.users[idx], ...data, updatedAt: new Date() };
        return this.users[idx];
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.users.find((u) => (where.id && u.id === where.id) || (where.email && u.email.toLowerCase() === where.email.toLowerCase()));
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const newUser = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.users.push(newUser);
        return newUser;
      },
    };
  }

  get address() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.addresses];
        if (where?.userId) list = list.filter((a) => a.userId === where.userId);
        return list;
      },
      create: async ({ data }: any) => {
        if (data.isDefault) {
          this.addresses.filter((a) => a.userId === data.userId).forEach((a) => (a.isDefault = false));
        }
        const newAddr = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.addresses.push(newAddr);
        return newAddr;
      },
      createMany: async ({ data }: any) => {
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          this.addresses.push({ id: uuid(), ...item, createdAt: new Date(), updatedAt: new Date() });
        }
        return { count: arr.length };
      },
      update: async ({ where, data }: any) => {
        const idx = this.addresses.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new Error('Address not found');
        this.addresses[idx] = { ...this.addresses[idx], ...data, updatedAt: new Date() };
        return this.addresses[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.addresses.findIndex((a) => a.id === where.id);
        if (idx !== -1) this.addresses.splice(idx, 1);
        return { success: true };
      },
    };
  }

  get category() {
    return {
      findMany: async ({ where, orderBy, include }: any = {}) => {
        let list = [...this.categories];
        if (where?.status) list = list.filter((c) => c.status === where.status);
        if (where?.type) list = list.filter((c) => c.type === where.type);
        if (where?.parentCategoryId !== undefined) list = list.filter((c) => c.parentCategoryId === where.parentCategoryId);
        if (where?.id?.in) list = list.filter((c) => where.id.in.includes(c.id));

        if (include?.children) {
          list = list.map((c) => ({
            ...c,
            children: this.categories.filter((child) => child.parentCategoryId === c.id),
          }));
        }
        if (include?.products) {
          list = list.map((c) => ({
            ...c,
            products: this.products.filter((p) => p.categoryId === c.id),
          }));
        }
        return list;
      },
      findUnique: async ({ where, include }: any) => {
        let cat = this.categories.find((c) => (where.id && c.id === where.id) || (where.slug && c.slug === where.slug)) || null;
        if (!cat) return null;
        const res = { ...cat };
        if (include?.children) {
          res.children = this.categories.filter((ch) => ch.parentCategoryId === cat.id);
        }
        if (include?.products) {
          res.products = this.products.filter((p) => p.categoryId === cat.id);
        }
        if (include?.parent && cat.parentCategoryId) {
          res.parent = this.categories.find((p) => p.id === cat.parentCategoryId) || null;
        }
        return res;
      },
      findFirst: async ({ where }: any = {}) => {
        return this.categories.find((c) => !where?.slug || c.slug === where.slug) || null;
      },
      create: async ({ data }: any) => {
        const newCat = { id: data.id || uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.categories.push(newCat);
        return newCat;
      },
      update: async ({ where, data }: any) => {
        const idx = this.categories.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error('Category not found');
        this.categories[idx] = { ...this.categories[idx], ...data, updatedAt: new Date() };
        return this.categories[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.categories.findIndex((c) => c.id === where.id);
        if (idx !== -1) this.categories.splice(idx, 1);
        return { success: true };
      },
      count: async () => this.categories.length,
      upsert: async ({ where, update, create }: any) => {
        const existing = this.categories.find((c) => (where.id && c.id === where.id) || (where.slug && c.slug === where.slug));
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const newCat = { id: create.id || uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.categories.push(newCat);
        return newCat;
      },
    };
  }

  get product() {
    return {
      findMany: async ({ where, orderBy, skip = 0, take = 50, include }: any = {}) => {
        let list = [...this.products];
        if (where?.status) list = list.filter((p) => p.status === where.status);
        if (where?.featured) list = list.filter((p) => p.featured === true);
        if (where?.isAddOn !== undefined) list = list.filter((p) => p.isAddOn === where.isAddOn);
        if (where?.addOnCategory) list = list.filter((p) => p.addOnCategory === where.addOnCategory);
        if (where?.isCustomHamperEligible !== undefined) list = list.filter((p) => p.isCustomHamperEligible === where.isCustomHamperEligible);
        if (where?.stock?.gt !== undefined) list = list.filter((p) => p.stock > where.stock.gt);
        if (where?.categoryId) {
          if (where.categoryId.in) list = list.filter((p) => where.categoryId.in.includes(p.categoryId));
          else list = list.filter((p) => p.categoryId === where.categoryId);
        }
        if (where?.id?.in) list = list.filter((p) => where.id.in.includes(p.id));
        if (where?.id?.not) list = list.filter((p) => p.id !== where.id.not);
        if (where?.brand?.equals) list = list.filter((p) => p.brand?.toLowerCase() === where.brand.equals.toLowerCase());
        if (where?.OR) {
          list = list.filter((p) => {
            return where.OR.some((cond: any) => {
              if (cond.name?.contains) return p.name.toLowerCase().includes(cond.name.contains.toLowerCase());
              if (cond.description?.contains) return p.description?.toLowerCase().includes(cond.description.contains.toLowerCase());
              if (cond.brand?.contains) return p.brand?.toLowerCase().includes(cond.brand.contains.toLowerCase());
              if (cond.sku?.contains) return p.sku.toLowerCase().includes(cond.sku.contains.toLowerCase());
              if (cond.tags?.has) return p.tags?.includes(cond.tags.has);
              return false;
            });
          });
        }
        if (where?.basePriceINR) {
          if (where.basePriceINR.gte !== undefined) list = list.filter((p) => p.basePriceINR >= where.basePriceINR.gte);
          if (where.basePriceINR.lte !== undefined) list = list.filter((p) => p.basePriceINR <= where.basePriceINR.lte);
        }

        // Sorting
        if (orderBy?.basePriceINR === 'asc') list.sort((a, b) => a.basePriceINR - b.basePriceINR);
        else if (orderBy?.basePriceINR === 'desc') list.sort((a, b) => b.basePriceINR - a.basePriceINR);
        else if (orderBy?.name === 'asc') list.sort((a, b) => a.name.localeCompare(b.name));

        const paginated = list.slice(skip, skip + take);

        return paginated.map((p) => {
          const res = { ...p };
          if (include?.category) {
            res.category = this.categories.find((c) => c.id === p.categoryId) || null;
          }
          if (include?.countryPrices) {
            res.countryPrices = this.productCountryPrices.filter((cp) => cp.productId === p.id);
          }
          if (include?._count?.reviews) {
            res._count = { reviews: this.reviews.filter((r) => r.productId === p.id && r.status === 'APPROVED').length };
          }
          return res;
        });
      },
      findUnique: async ({ where, include }: any) => {
        const prod = this.products.find((p) => (where.id && p.id === where.id) || (where.slug && p.slug === where.slug) || (where.sku && p.sku === where.sku)) || null;
        if (!prod) return null;
        const res = { ...prod };
        if (include?.category) {
          res.category = this.categories.find((c) => c.id === prod.categoryId) || null;
        }
        if (include?.countryPrices) {
          res.countryPrices = this.productCountryPrices.filter((cp) => cp.productId === prod.id);
        }
        if (include?.reviews) {
          res.reviews = this.reviews.filter((r) => r.productId === prod.id && r.status === 'APPROVED');
        }
        return res;
      },
      findFirst: async ({ where, include }: any = {}) => {
        const list = await this.product.findMany({ where, take: 1, include });
        return list[0] || null;
      },
      count: async ({ where }: any = {}) => {
        const list = await this.product.findMany({ where, take: 10000 });
        return list.length;
      },
      create: async ({ data }: any) => {
        const newProd = { id: data.id || uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.products.push(newProd);
        return newProd;
      },
      update: async ({ where, data }: any) => {
        const idx = this.products.findIndex((p) => p.id === where.id);
        if (idx === -1) throw new Error('Product not found');
        this.products[idx] = { ...this.products[idx], ...data, updatedAt: new Date() };
        return this.products[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.products.findIndex((p) => p.id === where.id);
        if (idx !== -1) this.products.splice(idx, 1);
        return { success: true };
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.products.find((p) => (where.id && p.id === where.id) || (where.slug && p.slug === where.slug) || (where.sku && p.sku === where.sku));
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const newProd = { id: create.id || uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.products.push(newProd);
        return newProd;
      },
    };
  }

  get productCountryPrice() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.productCountryPrices];
        if (where?.productId) list = list.filter((p) => p.productId === where.productId);
        return list;
      },
      create: async ({ data }: any) => {
        const item = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.productCountryPrices.push(item);
        return item;
      },
      upsert: async ({ where, update, create }: any) => {
        const { productId, country } = where.productId_country || {};
        const existing = this.productCountryPrices.find((p) => p.productId === productId && p.country === country);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const item = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.productCountryPrices.push(item);
        return item;
      },
      deleteMany: async ({ where }: any = {}) => {
        if (where?.productId) {
          this.productCountryPrices = this.productCountryPrices.filter((p) => p.productId !== where.productId);
        }
        return { count: 1 };
      },
    };
  }

  get hamper() {
    return {
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let list = [...this.hampers];
        if (where?.status) list = list.filter((h) => h.status === where.status);
        if (where?.featured) list = list.filter((h) => h.featured === true);
        if (where?.recipientType) list = list.filter((h) => h.recipientType === where.recipientType);
        if (where?.occasion) list = list.filter((h) => h.occasion === where.occasion);
        if (where?.countryAvailability?.has) {
          list = list.filter((h) => h.countryAvailability?.includes(where.countryAvailability.has));
        }

        return list.map((h) => {
          const res = { ...h };
          if (include?.items) {
            res.items = this.hamperItems
              .filter((itm) => itm.hamperId === h.id)
              .map((itm) => ({
                ...itm,
                product: include.items.include?.product ? this.products.find((p) => p.id === itm.productId) || null : undefined,
              }));
          }
          if (include?.countryPrices) {
            res.countryPrices = this.hamperCountryPrices.filter((cp) => cp.hamperId === h.id);
          }
          return res;
        });
      },
      findUnique: async ({ where, include }: any) => {
        const h = this.hampers.find((h) => (where.id && h.id === where.id) || (where.slug && h.slug === where.slug)) || null;
        if (!h) return null;
        const res = { ...h };
        if (include?.items) {
          res.items = this.hamperItems
            .filter((itm) => itm.hamperId === h.id)
            .map((itm) => ({
              ...itm,
              product: include.items.include?.product ? this.products.find((p) => p.id === itm.productId) || null : undefined,
            }));
        }
        if (include?.countryPrices) {
          res.countryPrices = this.hamperCountryPrices.filter((cp) => cp.hamperId === h.id);
        }
        return res;
      },
      findFirst: async ({ where, include }: any = {}) => {
        const list = await this.hamper.findMany({ where, include });
        return list[0] || null;
      },
      count: async () => this.hampers.length,
      create: async ({ data }: any) => {
        const newHamper = { id: data.id || uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.hampers.push(newHamper);
        return newHamper;
      },
      update: async ({ where, data }: any) => {
        const idx = this.hampers.findIndex((h) => h.id === where.id);
        if (idx === -1) throw new Error('Hamper not found');
        this.hampers[idx] = { ...this.hampers[idx], ...data, updatedAt: new Date() };
        return this.hampers[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.hampers.findIndex((h) => h.id === where.id);
        if (idx !== -1) this.hampers.splice(idx, 1);
        return { success: true };
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.hampers.find((h) => (where.id && h.id === where.id) || (where.slug && h.slug === where.slug));
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const newHamper = { id: create.id || uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.hampers.push(newHamper);
        return newHamper;
      },
    };
  }

  get hamperItem() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.hamperItems];
        if (where?.hamperId) list = list.filter((i) => i.hamperId === where.hamperId);
        return list;
      },
      create: async ({ data }: any) => {
        const itm = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.hamperItems.push(itm);
        return itm;
      },
      deleteMany: async ({ where }: any = {}) => {
        if (where?.hamperId) {
          this.hamperItems = this.hamperItems.filter((i) => i.hamperId !== where.hamperId);
        }
        return { count: 1 };
      },
      upsert: async ({ where, update, create }: any) => {
        const { hamperId, productId } = where.hamperId_productId || {};
        const existing = this.hamperItems.find((i) => i.hamperId === hamperId && i.productId === productId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const itm = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.hamperItems.push(itm);
        return itm;
      },
    };
  }

  get hamperCountryPrice() {
    return {
      upsert: async ({ where, update, create }: any) => {
        const { hamperId, country } = where.hamperId_country || {};
        const existing = this.hamperCountryPrices.find((c) => c.hamperId === hamperId && c.country === country);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const item = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.hamperCountryPrices.push(item);
        return item;
      },
      deleteMany: async ({ where }: any = {}) => {
        if (where?.hamperId) {
          this.hamperCountryPrices = this.hamperCountryPrices.filter((c) => c.hamperId !== where.hamperId);
        }
        return { count: 1 };
      },
    };
  }

  get customHamperConfig() {
    return {
      findFirst: async () => this._customHamperConfig,
      create: async ({ data }: any) => {
        this._customHamperConfig = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        return this._customHamperConfig;
      },
      update: async ({ where, data }: any) => {
        this._customHamperConfig = { ...this._customHamperConfig, ...data, updatedAt: new Date() };
        return this._customHamperConfig;
      },
      upsert: async ({ create, update }: any) => {
        if (this._customHamperConfig) {
          Object.assign(this._customHamperConfig, update, { updatedAt: new Date() });
          return this._customHamperConfig;
        }
        this._customHamperConfig = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        return this._customHamperConfig;
      },
    };
  }

  get cart() {
    return {
      findUnique: async ({ where, include }: any) => {
        const c = this.carts.find((cart) => (where.userId && cart.userId === where.userId) || (where.guestId && cart.guestId === where.guestId) || (where.id && cart.id === where.id)) || null;
        if (!c) return null;
        const res = { ...c };
        if (include?.items) {
          res.items = this.cartItems.filter((i) => i.cartId === c.id);
        }
        return res;
      },
      findFirst: async ({ where, include }: any = {}) => {
        return this.cart.findUnique({ where, include });
      },
      create: async ({ data }: any) => {
        const newCart = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.carts.push(newCart);
        return newCart;
      },
      update: async ({ where, data }: any) => {
        const idx = this.carts.findIndex((c) => c.id === where.id || (where.userId && c.userId === where.userId));
        if (idx === -1) throw new Error('Cart not found');
        this.carts[idx] = { ...this.carts[idx], ...data, updatedAt: new Date() };
        return this.carts[idx];
      },
    };
  }

  get cartItem() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.cartItems];
        if (where?.cartId) list = list.filter((i) => i.cartId === where.cartId);
        return list;
      },
      create: async ({ data }: any) => {
        const itm = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.cartItems.push(itm);
        return itm;
      },
      update: async ({ where, data }: any) => {
        const idx = this.cartItems.findIndex((i) => i.id === where.id);
        if (idx === -1) throw new Error('Cart item not found');
        this.cartItems[idx] = { ...this.cartItems[idx], ...data, updatedAt: new Date() };
        return this.cartItems[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.cartItems.findIndex((i) => i.id === where.id);
        if (idx !== -1) this.cartItems.splice(idx, 1);
        return { success: true };
      },
      deleteMany: async ({ where }: any = {}) => {
        if (where?.cartId) {
          this.cartItems = this.cartItems.filter((i) => i.cartId !== where.cartId);
        }
        return { count: 1 };
      },
    };
  }

  get order() {
    return {
      findMany: async ({ where, orderBy, skip = 0, take = 50, include }: any = {}) => {
        let list = [...this.orders];
        if (where?.userId) list = list.filter((o) => o.userId === where.userId);
        if (where?.orderStatus) list = list.filter((o) => o.orderStatus === where.orderStatus);
        if (where?.paymentStatus) list = list.filter((o) => o.paymentStatus === where.paymentStatus);
        if (where?.videoStatus) list = list.filter((o) => o.videoStatus === where.videoStatus);
        if (where?.deliveryCountry) list = list.filter((o) => o.deliveryCountry === where.deliveryCountry);

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const paginated = list.slice(skip, skip + take);
        return paginated.map((o) => {
          const res = { ...o };
          if (include?.items) {
            res.items = this.orderItems.filter((i) => i.orderId === o.id);
          }
          if (include?.timeline) {
            res.timeline = this.orderTimelines.filter((t) => t.orderId === o.id);
          }
          if (include?.user) {
            res.user = this.users.find((u) => u.id === o.userId) || null;
          }
          return res;
        });
      },
      findUnique: async ({ where, include }: any) => {
        const o = this.orders.find((ord) => 
          (where.id && ord.id === where.id) || 
          (where.orderNumber && ord.orderNumber === where.orderNumber) ||
          (where.videoSecureToken && ord.videoSecureToken === where.videoSecureToken)
        ) || null;
        if (!o) return null;
        const res = { ...o };
        if (include?.items) {
          res.items = this.orderItems.filter((i) => i.orderId === o.id);
        }
        if (include?.timeline) {
          res.timeline = this.orderTimelines.filter((t) => t.orderId === o.id);
        }
        if (include?.user) {
          res.user = this.users.find((u) => u.id === o.userId) || null;
        }
        return res;
      },
      findFirst: async ({ where, include }: any = {}) => {
        const list = await this.order.findMany({ where, take: 1, include });
        return list[0] || null;
      },
      count: async ({ where }: any = {}) => {
        const list = await this.order.findMany({ where, take: 10000 });
        return list.length;
      },
      create: async ({ data, include }: any) => {
        const orderId = uuid();
        const videoSecureToken = data.videoSecureToken || data.shippingAddress?.videoSecureToken || generateSecureToken();

        // Handle nested items creation
        if (data.items?.create) {
          const itemsToCreate = Array.isArray(data.items.create) ? data.items.create : [data.items.create];
          for (const itm of itemsToCreate) {
            this.orderItems.push({
              id: uuid(),
              orderId,
              itemType: itm.itemType || 'PRODUCT',
              productId: itm.productId || null,
              hamperId: itm.hamperId || null,
              name: itm.name,
              sku: itm.sku || null,
              unitPrice: itm.unitPrice,
              quantity: itm.quantity,
              totalPrice: itm.totalPrice,
              snapshot: itm.snapshot || {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // Handle nested timeline creation
        if (data.timeline?.create) {
          const timelinesToCreate = Array.isArray(data.timeline.create) ? data.timeline.create : [data.timeline.create];
          for (const t of timelinesToCreate) {
            this.orderTimelines.push({
              id: uuid(),
              orderId,
              status: t.status || 'PENDING',
              title: t.title || 'Order Placed',
              description: t.description || null,
              createdAt: new Date(),
            });
          }
        }

        const { items: _items, timeline: _timeline, ...cleanData } = data;
        const newOrder = {
          id: orderId,
          videoSecureToken,
          videoStatus: cleanData.videoStatus || cleanData.shippingAddress?.videoStatus || (cleanData.allowVideoQR ? 'VIDEO_REQUIRED' : 'NOT_REQUIRED'),
          ...cleanData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.orders.push(newOrder);

        const res = { ...newOrder };
        if (include?.timeline) {
          res.timeline = this.orderTimelines.filter((t) => t.orderId === orderId);
        }
        if (include?.items) {
          res.items = this.orderItems.filter((i) => i.orderId === orderId);
        }
        return res;
      },
      update: async ({ where, data }: any) => {
        const idx = this.orders.findIndex((o) => o.id === where.id || o.orderNumber === where.orderNumber || o.videoSecureToken === where.videoSecureToken);
        if (idx === -1) throw new Error('Order not found');
        this.orders[idx] = { ...this.orders[idx], ...data, updatedAt: new Date() };
        return this.orders[idx];
      },
      aggregate: async ({ where, _sum }: any = {}) => {
        let list = [...this.orders];
        if (where?.paymentStatus) list = list.filter((o) => o.paymentStatus === where.paymentStatus);
        const total = list.reduce((acc, curr) => acc + (curr.total || 0), 0);
        return { _sum: { total } };
      },
    };
  }

  get orderItem() {
    return {
      create: async ({ data }: any) => {
        const itm = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.orderItems.push(itm);
        return itm;
      },
      createMany: async ({ data }: any) => {
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          this.orderItems.push({ id: uuid(), ...item, createdAt: new Date(), updatedAt: new Date() });
        }
        return { count: arr.length };
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...this.orderItems];
        if (where?.orderId) list = list.filter((i) => i.orderId === where.orderId);
        return list;
      },
    };
  }

  get orderTimeline() {
    return {
      create: async ({ data }: any) => {
        const item = { id: uuid(), ...data, createdAt: new Date() };
        this.orderTimelines.push(item);
        return item;
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...this.orderTimelines];
        if (where?.orderId) list = list.filter((t) => t.orderId === where.orderId);
        return list;
      },
    };
  }

  get payment() {
    return {
      create: async ({ data }: any) => {
        const pay = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.payments.push(pay);
        return pay;
      },
      update: async ({ where, data }: any) => {
        const idx = this.payments.findIndex((p) => p.id === where.id || p.providerPaymentId === where.providerPaymentId);
        if (idx === -1) throw new Error('Payment not found');
        this.payments[idx] = { ...this.payments[idx], ...data, updatedAt: new Date() };
        return this.payments[idx];
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const p of this.payments) {
          if (!where?.orderId || p.orderId === where.orderId) {
            Object.assign(p, data, { updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
      findFirst: async ({ where }: any = {}) => {
        return this.payments.find((p) => (!where?.orderId || p.orderId === where.orderId) && (!where?.providerPaymentId || p.providerPaymentId === where.providerPaymentId)) || null;
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...this.payments];
        if (where?.orderId) list = list.filter((p) => p.orderId === where.orderId);
        return list;
      },
    };
  }

  get shipment() {
    return {
      create: async ({ data }: any) => {
        const item = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.shipments.push(item);
        return item;
      },
      findUnique: async ({ where }: any) => {
        return this.shipments.find((s) => s.id === where.id || s.orderId === where.orderId || s.awbNumber === where.awbNumber) || null;
      },
      findFirst: async ({ where }: any = {}) => {
        return this.shipments.find((s) => (!where?.orderId || s.orderId === where.orderId) && (!where?.awbNumber || s.awbNumber === where.awbNumber)) || null;
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...this.shipments];
        if (where?.orderId) list = list.filter((s) => s.orderId === where.orderId);
        if (where?.shipmentStatus) list = list.filter((s) => s.shipmentStatus === where.shipmentStatus);
        return list;
      },
      update: async ({ where, data }: any) => {
        const idx = this.shipments.findIndex((s) => s.id === where.id || s.orderId === where.orderId || s.awbNumber === where.awbNumber);
        if (idx === -1) throw new Error('Shipment not found');
        this.shipments[idx] = { ...this.shipments[idx], ...data, updatedAt: new Date() };
        return this.shipments[idx];
      },
      upsert: async ({ where, update, create }: any) => {
        const idx = this.shipments.findIndex((s) => s.id === where.id || s.orderId === where.orderId || s.awbNumber === where.awbNumber);
        if (idx !== -1) {
          this.shipments[idx] = { ...this.shipments[idx], ...update, updatedAt: new Date() };
          return this.shipments[idx];
        }
        const item = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.shipments.push(item);
        return item;
      },
      delete: async ({ where }: any) => {
        const idx = this.shipments.findIndex((s) => s.id === where.id || s.orderId === where.orderId);
        if (idx !== -1) this.shipments.splice(idx, 1);
        return { success: true };
      },
    };
  }

  get coupon() {
    return {
      findUnique: async ({ where }: any) => {
        return this.coupons.find((c) => (where.id && c.id === where.id) || (where.code && c.code.toUpperCase() === where.code.toUpperCase())) || null;
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...this.coupons];
        if (where?.active !== undefined) list = list.filter((c) => c.active === where.active);
        return list;
      },
      create: async ({ data }: any) => {
        const c = { id: uuid(), ...data, code: data.code.toUpperCase(), createdAt: new Date(), updatedAt: new Date() };
        this.coupons.push(c);
        return c;
      },
      update: async ({ where, data }: any) => {
        const idx = this.coupons.findIndex((c) => c.id === where.id || c.code.toUpperCase() === where.code?.toUpperCase());
        if (idx === -1) throw new Error('Coupon not found');
        this.coupons[idx] = { ...this.coupons[idx], ...data, updatedAt: new Date() };
        return this.coupons[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.coupons.findIndex((c) => c.id === where.id);
        if (idx !== -1) this.coupons.splice(idx, 1);
        return { success: true };
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.coupons.find((c) => c.code.toUpperCase() === where.code.toUpperCase());
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const c = { id: create.id || uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.coupons.push(c);
        return c;
      },
    };
  }

  get couponUsage() {
    return {
      create: async ({ data }: any) => {
        const u = { id: uuid(), ...data, createdAt: new Date() };
        this.couponUsages.push(u);
        return u;
      },
      count: async ({ where }: any = {}) => {
        let list = [...this.couponUsages];
        if (where?.couponId) list = list.filter((u) => u.couponId === where.couponId);
        if (where?.userId) list = list.filter((u) => u.userId === where.userId);
        return list.length;
      },
    };
  }

  get currency() {
    return {
      findMany: async () => this.currencies,
      findUnique: async ({ where }: any) => {
        return this.currencies.find((c) => c.code === where.code) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.currencies.find((c) => c.code === where.code);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const c = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.currencies.push(c);
        return c;
      },
    };
  }

  get exchangeRate() {
    return {
      findMany: async () => this.exchangeRates,
      findUnique: async ({ where }: any) => {
        const { fromCurrency, toCurrency } = where.fromCurrency_toCurrency || {};
        return this.exchangeRates.find((e) => e.fromCurrency === fromCurrency && e.toCurrency === toCurrency) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        const { fromCurrency, toCurrency } = where.fromCurrency_toCurrency || {};
        const existing = this.exchangeRates.find((e) => e.fromCurrency === fromCurrency && e.toCurrency === toCurrency);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const item = { id: uuid(), ...create, updatedAt: new Date() };
        this.exchangeRates.push(item);
        return item;
      },
    };
  }

  get shippingRule() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.shippingRules];
        if (where?.active !== undefined) list = list.filter((r) => r.active === where.active);
        return list;
      },
      findUnique: async ({ where }: any) => {
        return this.shippingRules.find((r) => r.country === where.country) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = this.shippingRules.findIndex((r) => r.country === where.country || r.id === where.id);
        if (idx === -1) throw new Error('Shipping rule not found');
        this.shippingRules[idx] = { ...this.shippingRules[idx], ...data, updatedAt: new Date() };
        return this.shippingRules[idx];
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.shippingRules.find((r) => r.country === where.country);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const item = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.shippingRules.push(item);
        return item;
      },
    };
  }

  get heroSlide() {
    return {
      findMany: async ({ where, orderBy }: any = {}) => {
        let list = [...this.heroSlides];
        if (where?.status) list = list.filter((s) => s.status === where.status);
        list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        return list;
      },
      findUnique: async ({ where }: any) => {
        return this.heroSlides.find((s) => s.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const s = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.heroSlides.push(s);
        return s;
      },
      update: async ({ where, data }: any) => {
        const idx = this.heroSlides.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error('Hero slide not found');
        this.heroSlides[idx] = { ...this.heroSlides[idx], ...data, updatedAt: new Date() };
        return this.heroSlides[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.heroSlides.findIndex((s) => s.id === where.id);
        if (idx !== -1) this.heroSlides.splice(idx, 1);
        return { success: true };
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = this.heroSlides.find((s) => s.id === where.id);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const s = { ...create, createdAt: new Date(), updatedAt: new Date() };
        this.heroSlides.push(s);
        return s;
      },
    };
  }

  get review() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.reviews];
        if (where?.productId) list = list.filter((r) => r.productId === where.productId);
        if (where?.status) list = list.filter((r) => r.status === where.status);
        return list;
      },
      create: async ({ data }: any) => {
        const rev = { id: uuid(), ...data, createdAt: new Date(), updatedAt: new Date() };
        this.reviews.push(rev);
        return rev;
      },
      update: async ({ where, data }: any) => {
        const idx = this.reviews.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error('Review not found');
        this.reviews[idx] = { ...this.reviews[idx], ...data, updatedAt: new Date() };
        return this.reviews[idx];
      },
      delete: async ({ where }: any) => {
        const idx = this.reviews.findIndex((r) => r.id === where.id);
        if (idx !== -1) this.reviews.splice(idx, 1);
        return { success: true };
      },
    };
  }

  get wishlistItem() {
    return {
      findMany: async ({ where }: any = {}) => {
        let list = [...this.wishlistItems];
        if (where?.userId) list = list.filter((w) => w.userId === where.userId);
        return list;
      },
      create: async ({ data }: any) => {
        const item = { id: uuid(), ...data, createdAt: new Date() };
        this.wishlistItems.push(item);
        return item;
      },
      delete: async ({ where }: any) => {
        const { userId, productId } = where.userId_productId || {};
        const idx = this.wishlistItems.findIndex((w) => w.userId === userId && w.productId === productId);
        if (idx !== -1) this.wishlistItems.splice(idx, 1);
        return { success: true };
      },
    };
  }

  get siteSetting() {
    return {
      findUnique: async ({ where }: any) => {
        return this.siteSettings.find((s) => s.key === where.key) || null;
      },
      findMany: async () => this.siteSettings,
      upsert: async ({ where, update, create }: any) => {
        const existing = this.siteSettings.find((s) => s.key === where.key);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const item = { id: uuid(), ...create, createdAt: new Date(), updatedAt: new Date() };
        this.siteSettings.push(item);
        return item;
      },
    };
  }

  get auditLog() {
    return {
      create: async ({ data }: any) => {
        const log = { id: uuid(), ...data, createdAt: new Date() };
        this.auditLogs.push(log);
        return log;
      },
      findMany: async () => this.auditLogs,
    };
  }

  async $transaction(arg: any) {
    if (typeof arg === 'function') {
      return arg(this);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  }

  async $disconnect() {
    return true;
  }
}

export const memoryDb = new MemoryDatabase();
