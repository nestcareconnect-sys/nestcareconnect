import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CurrencyCode } from '@prisma/client';

export async function getSiteSettings(req: Request, res: Response) {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'general_settings' },
    });

    const currencies = await prisma.currency.findMany();
    const exchangeRates = await prisma.exchangeRate.findMany();

    return res.json({
      success: true,
      data: {
        settings: setting?.value || {
          companyName: 'Nest Care Connect',
          contactEmail: 'support@nestcareconnect.com',
          contactPhone: '+91 800 123 4567',
          whatsappNumber: '+91 98765 43210',
          officeAddress: 'Nest Healthcare Hub, Level 4, Tech Enclave, Indiranagar, Bengaluru, 560038',
          supportedCountries: ['IN', 'AE', 'US'],
          supportedCurrencies: ['INR', 'AED', 'USD'],
          defaultCurrency: 'INR',
          freeShippingEnabled: true,
        },
        currencies,
        exchangeRates,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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

    return res.json({ success: true, message: 'Settings saved.', data: updated.value });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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
    return res.json({ success: true, message: 'Exchange rates updated.', data: updatedRates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
