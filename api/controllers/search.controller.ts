import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Comprehensive healthcare, gifting and e-commerce typo dictionary
const TYPO_MAP: Record<string, string> = {
  diabetis: 'diabetes',
  diabtes: 'diabetes',
  diabitis: 'diabetes',
  diabatic: 'diabetes',
  diabetic: 'diabetes',
  glucse: 'glucose',
  glucometr: 'glucose',
  glucosse: 'glucose',
  gluco: 'glucose',
  glycose: 'glucose',
  glucometer: 'glucose',
  diapr: 'diaper',
  daiper: 'diaper',
  panper: 'diaper',
  pamper: 'diaper',
  pampers: 'diaper',
  diapers: 'diaper',
  suger: 'sugar',
  sugr: 'sugar',
  srip: 'strip',
  strips: 'strip',
  presure: 'pressure',
  presur: 'pressure',
  bp: 'bp',
  omran: 'omron',
  ormon: 'omron',
  oximter: 'oximeter',
  oximetr: 'oximeter',
  thermometr: 'thermometer',
  termo: 'thermometer',
  inhalor: 'inhaler',
  stablizer: 'stabilizer',
  stablaizer: 'stabilizer',
  hampr: 'hamper',
  hamprs: 'hamper',
  hampers: 'hamper',
  annivrsary: 'anniversary',
  aniversary: 'anniversary',
  aniversry: 'anniversary',
  anivrsry: 'anniversary',
  weding: 'wedding',
  marrige: 'wedding',
  marraige: 'wedding',
  kasav: 'kasavu',
  keral: 'kerala',
  zimmer: 'zimmer',
  zimer: 'zimmer',
  zimmar: 'zimmer',
  ayur: 'ayurvedic',
  ayurweda: 'ayurvedic',
  coffie: 'coffee',
  coffe: 'coffee',
  cashew: 'cashew',
  cashiew: 'cashew',
};

export async function searchCatalog(req: Request, res: Response) {
  try {
    const { q = '' } = req.query;
    const rawQuery = (q as string).trim().toLowerCase();

    if (!rawQuery) {
      return res.json({
        success: true,
        data: {
          products: [],
          categories: [],
          hampers: [],
          correctedQuery: null,
          suggestions: ['Glucose Monitor', 'Omron BP Monitor', 'Adult Diapers', 'Essential Care Hamper', 'Kasavu Saree', 'Anniversary Hamper'],
        },
      });
    }

    // Check for typo correction
    let correctedWords: string[] = [];
    let hasCorrection = false;
    const words = rawQuery.split(/\s+/).filter(Boolean);

    for (const w of words) {
      if (TYPO_MAP[w]) {
        correctedWords.push(TYPO_MAP[w]);
        if (TYPO_MAP[w] !== w) {
          hasCorrection = true;
        }
      } else {
        correctedWords.push(w);
      }
    }

    const effectiveQuery = hasCorrection ? correctedWords.join(' ') : rawQuery;

    // Search in parallel with optimized field selections
    const [products, categories, hampers] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: effectiveQuery, mode: 'insensitive' } },
            { description: { contains: effectiveQuery, mode: 'insensitive' } },
            { brand: { contains: effectiveQuery, mode: 'insensitive' } },
            { tags: { has: effectiveQuery } },
            ...(hasCorrection
              ? [
                  { name: { contains: rawQuery, mode: 'insensitive' } },
                  { description: { contains: rawQuery, mode: 'insensitive' } },
                ]
              : []),
          ],
        },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          basePriceINR: true,
          compareAtPriceINR: true,
          images: true,
          stock: true,
          unit: true,
          countryPrices: true,
        },
      }),
      prisma.category.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: effectiveQuery, mode: 'insensitive' } },
            { description: { contains: effectiveQuery, mode: 'insensitive' } },
            ...(hasCorrection
              ? [{ name: { contains: rawQuery, mode: 'insensitive' } }]
              : []),
          ],
        },
        take: 4,
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          type: true,
          description: true,
        },
      }),
      prisma.hamper.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: effectiveQuery, mode: 'insensitive' } },
            { description: { contains: effectiveQuery, mode: 'insensitive' } },
            ...(hasCorrection
              ? [{ name: { contains: rawQuery, mode: 'insensitive' } }]
              : []),
          ],
        },
        take: 4,
        select: {
          id: true,
          name: true,
          slug: true,
          hamperType: true,
          fixedPriceINR: true,
          startingPriceINR: true,
          images: true,
          countryPrices: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        products,
        categories,
        hampers,
        correctedQuery: hasCorrection ? effectiveQuery : null,
        totalResults: products.length + categories.length + hampers.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

