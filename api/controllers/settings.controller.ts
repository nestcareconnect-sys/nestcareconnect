import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CurrencyCode } from '@prisma/client';
import { handleControllerError } from '../utils/dbError.js';
import { cacheService } from '../services/cache.service.js';

export async function getSiteSettings(req: Request, res: Response) {
  try {
    const cached = cacheService.get('site_settings');
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const [setting, currencies, exchangeRates] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: 'general_settings' },
      }),
      prisma.currency.findMany(),
      prisma.exchangeRate.findMany(),
    ]);

    const data = {
      settings: setting?.value || {
        companyName: 'Nest Care Connect',
        contactEmail: 'support@nestcareconnect.com',
        contactPhone: '+91 800 123 4567',
        whatsappNumber: '+91 89213 42411',
        officeAddress: 'Nest Healthcare Hub, Level 4, Tech Enclave, Indiranagar, Bengaluru, 560038',
        supportedCountries: ['IN', 'AE', 'US'],
        supportedCurrencies: ['INR', 'AED', 'USD'],
        defaultCurrency: 'INR',
        freeShippingEnabled: true,
      },
      currencies,
      exchangeRates,
    };

    cacheService.set('site_settings', data, 900); // 15 min cache

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch site settings.');
  }
}

export async function updateSiteSettings(req: Request, res: Response) {
  try {
    const { settings } = req.body;

    const updated = await prisma.siteSetting.upsert({
      where: { key: 'general_settings' },
      update: { value: settings },
      create: { key: 'general_settings', value: settings },
    });

    cacheService.del('site_settings');

    return res.json({ success: true, message: 'Settings saved.', data: updated.value });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update site settings.');
  }
}

export async function updateExchangeRates(req: Request, res: Response) {
  try {
    const { rates } = req.body; // Array of { fromCurrency, toCurrency, rate }

    if (Array.isArray(rates)) {
      for (const r of rates) {
        await prisma.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: {
              fromCurrency: r.fromCurrency as CurrencyCode,
              toCurrency: r.toCurrency as CurrencyCode,
            },
          },
          update: { rate: parseFloat(r.rate) },
          create: {
            fromCurrency: r.fromCurrency as CurrencyCode,
            toCurrency: r.toCurrency as CurrencyCode,
            rate: parseFloat(r.rate),
          },
        });
      }
    }

    const updatedRates = await prisma.exchangeRate.findMany();
    cacheService.del('site_settings');
    cacheService.del('exchange_rates_map');
    return res.json({ success: true, message: 'Exchange rates updated.', data: updatedRates });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update exchange rates.');
  }
}
