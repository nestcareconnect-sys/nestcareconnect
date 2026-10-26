/**
 * Shared Shipping & Volumetric Weight Calculation Utility (Frontend Client)
 * Provides real-time calculation and preview for Admin forms and Checkout.
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

export function normalizeWeightToKg(value: number, unit: WeightUnit = 'kg'): number {
  if (isNaN(value) || value <= 0) return 0;
  if (unit === 'g') {
    return Math.round((value / 1000) * 10000) / 10000;
  }
  return Math.round(value * 10000) / 10000;
}

export function convertWeightFromKg(weightKg: number, targetUnit: WeightUnit = 'kg'): number {
  if (isNaN(weightKg) || weightKg <= 0) return 0;
  if (targetUnit === 'g') {
    return Math.round(weightKg * 1000);
  }
  return Math.round(weightKg * 1000) / 1000;
}

export function normalizeDimensionToCm(value: number, unit: DimensionUnit = 'cm'): number {
  if (isNaN(value) || value <= 0) return 0;
  if (unit === 'in') {
    return Math.round(value * INCH_TO_CM_MULTIPLIER * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

export function convertDimensionFromCm(valCm: number, targetUnit: DimensionUnit = 'cm'): number {
  if (isNaN(valCm) || valCm <= 0) return 0;
  if (targetUnit === 'in') {
    return Math.round(valCm * CM_TO_INCH_MULTIPLIER * 100) / 100;
  }
  return Math.round(valCm * 100) / 100;
}

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
  const divisor = params.customDivisor && params.customDivisor > 0 ? params.customDivisor : DEFAULT_VOLUMETRIC_DIVISOR;

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
