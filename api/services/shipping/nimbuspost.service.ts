/**
 * Backward compatibility bridge for NimbusPostService.
 * Re-exports from modular shipping architecture.
 */
import { shippingService } from './shipping.service.js';
import { NimbusPostShippingProvider } from './nimbuspost.provider.js';

export * from './shippingProvider.interface.js';
export * from './nimbuspost.provider.js';
export * from './shipping.service.js';

export const nimbusPostService = {
  checkServiceability: (pincode: string, pickupPincode?: string, weightKg: number = 1.0) =>
    shippingService.checkServiceability({
      destinationPincode: pincode,
      originPincode: pickupPincode,
      weightKg,
    }),

  createShipment: (params: any) =>
    shippingService.createShipmentForOrder(params.orderId, {
      courierId: params.courierId,
      courierName: params.courierName,
      pickupPincode: params.pickupPincode,
    }),

  trackShipment: (awb: string) => shippingService.trackShipment(awb),

  cancelShipment: (awb: string) => shippingService.cancelShipment(awb),

  getSettings: () => new NimbusPostShippingProvider().getConfig(),

  saveSettings: async (data: any) => {
    const { default: prisma } = await import('../../config/prisma.js');
    return await prisma.siteSetting.upsert({
      where: { key: 'nimbuspost_config' },
      update: { value: data },
      create: { key: 'nimbuspost_config', value: data },
    });
  },
};
