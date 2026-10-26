/**
 * Shared Shipping & Volumetric Weight Calculation Utility
 * Standardized across Admin Panel, Cart, Checkout, and NimbusPost Courier Integration.
 */

export const DEFAULT_VOLUMETRIC_DIVISOR = 5000;
export const INCH_TO_CM_MULTIPLIER = 2.54;
export const CM_TO_INCH_MULTIPLIER = 1 / 2.54;
export const MIN_BILLABLE_WEIGHT_KG = 0.5;

export type WeightUnit = 'g' | 'kg';
export type DimensionUnit = 'cm' | 'in';

export interface ProductShippingDimensions {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  weightUnit?: WeightUnit;
  dimensionUnit?: DimensionUnit;
}

export interface PackedShipmentResult {
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  totalVolumeCm3: number;
  itemCount: number;
  isComplete: boolean;
  missingProducts: Array<{ id: string; name: string; sku?: string; missingFields: string[] }>;
}

/**
 * Get active volumetric divisor (allows environment variable or courier-specific override)
 */
export function getVolumetricDivisor(customDivisor?: number): number {
  if (customDivisor && customDivisor > 0) return customDivisor;
  const envDivisor = process.env.NIMBUSPOST_VOLUMETRIC_DIVISOR;
  if (envDivisor) {
    const parsed = parseFloat(envDivisor);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_VOLUMETRIC_DIVISOR;
}

/**
 * Normalize weight to kilograms (kg)
 */
export function normalizeWeightToKg(value: number, unit: WeightUnit = 'kg'): number {
  if (isNaN(value) || value <= 0) return 0;
  if (unit === 'g') {
    return Math.round((value / 1000) * 10000) / 10000;
  }
  return Math.round(value * 10000) / 10000;
}

/**
 * Convert kilograms (kg) to target unit
 */
export function convertWeightFromKg(weightKg: number, targetUnit: WeightUnit = 'kg'): number {
  if (isNaN(weightKg) || weightKg <= 0) return 0;
  if (targetUnit === 'g') {
    return Math.round(weightKg * 1000);
  }
  return Math.round(weightKg * 1000) / 1000;
}

/**
 * Normalize dimension to centimeters (cm)
 */
export function normalizeDimensionToCm(value: number, unit: DimensionUnit = 'cm'): number {
  if (isNaN(value) || value <= 0) return 0;
  if (unit === 'in') {
    return Math.round(value * INCH_TO_CM_MULTIPLIER * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Convert centimeters (cm) to target unit
 */
export function convertDimensionFromCm(valCm: number, targetUnit: DimensionUnit = 'cm'): number {
  if (isNaN(valCm) || valCm <= 0) return 0;
  if (targetUnit === 'in') {
    return Math.round(valCm * CM_TO_INCH_MULTIPLIER * 100) / 100;
  }
  return Math.round(valCm * 100) / 100;
}

/**
 * Calculate volumetric weight in kilograms (kg)
 * Formula: (Length_cm * Width_cm * Height_cm) / Volumetric Divisor
 */
export function calculateVolumetricWeightKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number = DEFAULT_VOLUMETRIC_DIVISOR
): number {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || divisor <= 0) return 0;
  const volumeCm3 = lengthCm * widthCm * heightCm;
  const volWeight = volumeCm3 / divisor;
  return Math.round(volWeight * 1000) / 1000;
}

/**
 * Calculate chargeable weight in kilograms (kg)
 * Formula: max(actualWeightKg, volumetricWeightKg), with optional minimum billable threshold
 */
export function calculateChargeableWeightKg(
  actualWeightKg: number,
  volumetricWeightKg: number,
  applyMinBillable: boolean = false
): number {
  const maxWeight = Math.max(
    Math.max(0, actualWeightKg || 0),
    Math.max(0, volumetricWeightKg || 0)
  );
  if (applyMinBillable) {
    return Math.max(MIN_BILLABLE_WEIGHT_KG, Math.round(maxWeight * 1000) / 1000);
  }
  return Math.round(maxWeight * 1000) / 1000;
}

/**
 * Authoritatively compute all derived product shipping values
 */
export function calculateProductShippingDetails(params: {
  weight: number;
  weightUnit?: WeightUnit;
  length: number;
  width: number;
  height: number;
  dimensionUnit?: DimensionUnit;
  customDivisor?: number;
}): ProductShippingDimensions {
  const weightUnit = params.weightUnit || 'kg';
  const dimensionUnit = params.dimensionUnit || 'cm';
  const divisor = getVolumetricDivisor(params.customDivisor);

  const weightKg = normalizeWeightToKg(params.weight, weightUnit);
  const lengthCm = normalizeDimensionToCm(params.length, dimensionUnit);
  const widthCm = normalizeDimensionToCm(params.width, dimensionUnit);
  const heightCm = normalizeDimensionToCm(params.height, dimensionUnit);

  const volumetricWeightKg = calculateVolumetricWeightKg(lengthCm, widthCm, heightCm, divisor);
  const chargeableWeightKg = calculateChargeableWeightKg(weightKg, volumetricWeightKg);

  return {
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    volumetricWeightKg,
    chargeableWeightKg,
    weightUnit,
    dimensionUnit,
  };
}

/**
 * Check whether a product has complete shipping details (weight + dimensions > 0)
 */
export function hasCompleteShippingDetails(product: any): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  const weight = product?.weight || product?.packageWeight;
  const length = product?.length || product?.packageLength;
  const width = product?.width || product?.packageWidth;
  const height = product?.height || product?.packageHeight;

  if (!weight || weight <= 0) missing.push('Product Weight');
  if (!length || length <= 0) missing.push('Length');
  if (!width || width <= 0) missing.push('Width');
  if (!height || height <= 0) missing.push('Height');

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Aggregate cart / order items into a consolidated packed parcel for courier rating
 * Handles:
 * - Direct products with actual weights & dimensions
 * - Quantities per item (w * qty)
 * - Detects missing dimensions without inventing fake values
 * - Computes realistic 3D parcel footprint and volumetric weight
 */
export function calculateCartShipmentPackage(
  items: Array<{
    quantity: number;
    product?: any;
    hamper?: any;
    itemType?: string;
    customHamperData?: any;
    name?: string;
  }>,
  customDivisor?: number
): PackedShipmentResult {
  const divisor = getVolumetricDivisor(customDivisor);
  const missingProducts: Array<{ id: string; name: string; sku?: string; missingFields: string[] }> = [];

  let totalActualWeightKg = 0;
  let totalItemVolumeCm3 = 0;
  let maxItemLength = 20; // Default minimum parcel envelope length
  let maxItemWidth = 15;  // Default minimum parcel envelope width
  let totalCount = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantity || 1);
    totalCount += qty;

    if (item.itemType === 'CUSTOM_HAMPER') {
      const box = item.customHamperData?.box || {};
      const boxWeight = box.maxWeight ? Math.min(0.5, box.maxWeight * 0.1) : 0.4;
      const bLength = box.length || 30;
      const bWidth = box.width || 20;
      const bHeight = box.height || 12;

      totalActualWeightKg += (1.5 + boxWeight) * qty;
      totalItemVolumeCm3 += (bLength * bWidth * bHeight) * qty;
      maxItemLength = Math.max(maxItemLength, bLength);
      maxItemWidth = Math.max(maxItemWidth, bWidth);
      continue;
    }

    if (item.itemType === 'HAMPER' && item.hamper) {
      const hLength = 28;
      const hWidth = 20;
      const hHeight = 12;
      const hWeight = 1.2;

      totalActualWeightKg += hWeight * qty;
      totalItemVolumeCm3 += (hLength * hWidth * hHeight) * qty;
      maxItemLength = Math.max(maxItemLength, hLength);
      maxItemWidth = Math.max(maxItemWidth, hWidth);
      continue;
    }

    // Direct product
    const p = item.product;
    if (!p) continue;

    const check = hasCompleteShippingDetails(p);
    if (!check.isComplete) {
      missingProducts.push({
        id: p.id,
        name: p.name || item.name || 'Unnamed Product',
        sku: p.sku,
        missingFields: check.missingFields,
      });
    }

    const pWeight = p.weight || p.packageWeight || 0;
    const pLength = p.length || p.packageLength || 0;
    const pWidth = p.width || p.packageWidth || 0;
    const pHeight = p.height || p.packageHeight || 0;

    totalActualWeightKg += pWeight * qty;

    if (pLength > 0 && pWidth > 0 && pHeight > 0) {
      totalItemVolumeCm3 += (pLength * pWidth * pHeight) * qty;
      maxItemLength = Math.max(maxItemLength, pLength);
      maxItemWidth = Math.max(maxItemWidth, pWidth);
    }
  }

  // Packing strategy: Apply a 1.15 packaging / cushioning factor to consolidated volume
  const packingCushionFactor = 1.15;
  const packedVolumeCm3 = Math.round(totalItemVolumeCm3 * packingCushionFactor);

  // Parcel dimensions: length and width are formed by the largest item dimension
  const parcelLength = Math.max(maxItemLength, 20);
  const parcelWidth = Math.max(maxItemWidth, 15);
  // Calculate necessary height to enclose total volume, with minimum 5 cm
  const computedHeight = Math.ceil(packedVolumeCm3 / (parcelLength * parcelWidth));
  const parcelHeight = Math.max(5, Math.min(100, isNaN(computedHeight) || computedHeight <= 0 ? 10 : computedHeight));

  const volumetricWeightKg = calculateVolumetricWeightKg(parcelLength, parcelWidth, parcelHeight, divisor);
  const chargeableWeightKg = calculateChargeableWeightKg(totalActualWeightKg, volumetricWeightKg, true);

  return {
    actualWeightKg: Math.round(totalActualWeightKg * 1000) / 1000,
    volumetricWeightKg,
    chargeableWeightKg,
    lengthCm: parcelLength,
    breadthCm: parcelWidth,
    heightCm: parcelHeight,
    totalVolumeCm3: packedVolumeCm3,
    itemCount: totalCount,
    isComplete: missingProducts.length === 0,
    missingProducts,
  };
}
