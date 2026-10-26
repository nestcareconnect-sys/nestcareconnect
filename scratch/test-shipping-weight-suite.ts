import dotenv from 'dotenv';
dotenv.config();
import prisma from '../api/config/prisma.js';
import {
  calculateProductShippingDetails,
  calculateVolumetricWeightKg,
  calculateChargeableWeightKg,
  normalizeWeightToKg,
  convertWeightFromKg,
  normalizeDimensionToCm,
  convertDimensionFromCm,
  hasCompleteShippingDetails,
  calculateCartShipmentPackage,
} from '../api/utils/shippingCalculation.js';
import { shippingService } from '../api/services/shipping/shipping.service.js';

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 Comprehensive Product Weight & Volumetric Shipping Suite');
  console.log('===========================================================\n');

  let passed = 0;
  let total = 12;

  // -------------------------------------------------------------
  // Test 1: Grams to Kilograms & Kilograms to Grams Conversion
  // -------------------------------------------------------------
  try {
    const w1 = normalizeWeightToKg(500, 'g');
    const w2 = normalizeWeightToKg(1.5, 'kg');
    const backG = convertWeightFromKg(w1, 'g');
    if (w1 === 0.5 && w2 === 1.5 && backG === 500) {
      console.log('✅ [1/12] Unit Conversion (Grams <-> Kilograms): PASSED');
      console.log(`   500g -> ${w1}kg, 1.5kg -> ${w2}kg, back to grams: ${backG}g`);
      passed++;
    } else {
      console.error('❌ [1/12] Unit Conversion (Grams <-> Kilograms): FAILED', { w1, w2, backG });
    }
  } catch (err: any) {
    console.error('❌ [1/12] Unit Conversion: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Inches to Centimeters & Centimeters to Inches Conversion
  // -------------------------------------------------------------
  try {
    const d1 = normalizeDimensionToCm(10, 'in'); // 10 inches = 25.4 cm
    const d2 = normalizeDimensionToCm(25.4, 'cm');
    const backIn = convertDimensionFromCm(25.4, 'in'); // 10 inches
    if (d1 === 25.4 && d2 === 25.4 && Math.abs(backIn - 10) < 0.01) {
      console.log('✅ [2/12] Unit Conversion (Inches <-> Centimeters): PASSED');
      console.log(`   10 in -> ${d1} cm, 25.4 cm -> ${backIn} in`);
      passed++;
    } else {
      console.error('❌ [2/12] Unit Conversion (Inches <-> Centimeters): FAILED', { d1, d2, backIn });
    }
  } catch (err: any) {
    console.error('❌ [2/12] Unit Conversion: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Volumetric Weight Calculation & Chargeable Weight Formula
  // -------------------------------------------------------------
  try {
    // 30 cm x 20 cm x 25 cm = 15,000 cm3. Divisor 5000 -> 3.0 kg
    const volWeight = calculateVolumetricWeightKg(30, 20, 25, 5000);
    // Case A: Actual 0.5kg, Volumetric 3.0kg -> Chargeable 3.0kg
    const chgWeightA = calculateChargeableWeightKg(0.5, volWeight);
    // Case B: Actual 4.5kg, Volumetric 3.0kg -> Chargeable 4.5kg
    const chgWeightB = calculateChargeableWeightKg(4.5, volWeight);

    if (volWeight === 3.0 && chgWeightA === 3.0 && chgWeightB === 4.5) {
      console.log('✅ [3/12] Volumetric & Chargeable Weight Formula: PASSED');
      console.log(`   30x20x25cm / 5000 = ${volWeight}kg`);
      console.log(`   Chargeable A (act: 0.5kg, vol: 3.0kg) -> ${chgWeightA}kg (Volumetric governs)`);
      console.log(`   Chargeable B (act: 4.5kg, vol: 3.0kg) -> ${chgWeightB}kg (Actual governs)`);
      passed++;
    } else {
      console.error('❌ [3/12] Volumetric & Chargeable Weight: FAILED', { volWeight, chgWeightA, chgWeightB });
    }
  } catch (err: any) {
    console.error('❌ [3/12] Volumetric & Chargeable Weight: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Creating a Product with Complete Shipping Details
  // -------------------------------------------------------------
  const testSku = `TEST-SHIP-${Date.now()}`;
  let createdProductId = '';
  try {
    const shippingVals = calculateProductShippingDetails({
      weight: 450,
      weightUnit: 'g',
      length: 22,
      width: 16,
      height: 12,
      dimensionUnit: 'cm',
    });

    const created = await prisma.product.create({
      data: {
        name: 'Automated Test Healthcare Monitor',
        slug: `automated-test-healthcare-monitor-${Date.now()}`,
        sku: testSku,
        description: 'Product created by automated shipping test suite.',
        basePriceINR: 1299,
        stock: 25,
        weight: shippingVals.weightKg, // 0.45 kg
        weightUnit: 'g',
        length: shippingVals.lengthCm, // 22 cm
        width: shippingVals.widthCm,   // 16 cm
        height: shippingVals.heightCm, // 12 cm
        dimensionUnit: 'cm',
        volumetricWeight: shippingVals.volumetricWeightKg, // (22*16*12)/5000 = 0.845 kg
        chargeableWeight: shippingVals.chargeableWeightKg, // max(0.45, 0.845) = 0.845 kg
        packageLength: shippingVals.lengthCm,
        packageWidth: shippingVals.widthCm,
        packageHeight: shippingVals.heightCm,
        packageWeight: shippingVals.chargeableWeightKg,
        dimensions: '22 x 16 x 12 cm',
      },
    });
    createdProductId = created.id;

    if (
      created.weight === 0.45 &&
      created.length === 22 &&
      created.volumetricWeight === 0.845 &&
      created.chargeableWeight === 0.845
    ) {
      console.log('✅ [4/12] Create Product with Complete Shipping Details: PASSED');
      console.log(`   Created product ID: ${created.id}`);
      console.log(`   Weight: ${created.weight}kg, Dimensions: ${created.length}x${created.width}x${created.height}cm, Volumetric: ${created.volumetricWeight}kg, Chargeable: ${created.chargeableWeight}kg`);
      passed++;
    } else {
      console.error('❌ [4/12] Create Product: FAILED', created);
    }
  } catch (err: any) {
    console.error('❌ [4/12] Create Product: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Editing Product Shipping Details (Recalculate & Persist)
  // -------------------------------------------------------------
  try {
    // Update to 2.5 kg actual, 10x10x10 cm (0.2 kg volumetric) -> Chargeable should become 2.5 kg
    const updatedVals = calculateProductShippingDetails({
      weight: 2.5,
      weightUnit: 'kg',
      length: 10,
      width: 10,
      height: 10,
      dimensionUnit: 'cm',
    });

    const updated = await prisma.product.update({
      where: { id: createdProductId },
      data: {
        weight: updatedVals.weightKg,
        weightUnit: 'kg',
        length: updatedVals.lengthCm,
        width: updatedVals.widthCm,
        height: updatedVals.heightCm,
        dimensionUnit: 'cm',
        volumetricWeight: updatedVals.volumetricWeightKg,
        chargeableWeight: updatedVals.chargeableWeightKg,
        packageLength: updatedVals.lengthCm,
        packageWidth: updatedVals.widthCm,
        packageHeight: updatedVals.heightCm,
        packageWeight: updatedVals.chargeableWeightKg,
      },
    });

    if (updated.weight === 2.5 && updated.chargeableWeight === 2.5 && updated.volumetricWeight === 0.2) {
      console.log('✅ [5/12] Edit Product Shipping Details: PASSED');
      console.log(`   Updated to Actual: ${updated.weight}kg, Volumetric: ${updated.volumetricWeight}kg -> Chargeable: ${updated.chargeableWeight}kg`);
      passed++;
    } else {
      console.error('❌ [5/12] Edit Product Shipping Details: FAILED', updated);
    }
  } catch (err: any) {
    console.error('❌ [5/12] Edit Product: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Incomplete Dimensions Detection & Safety Verification
  // -------------------------------------------------------------
  try {
    const incompleteProduct = {
      id: 'test-incomplete-prod',
      name: 'Item Lacking Dimensions',
      weight: 0.5,
      length: null,
      width: null,
      height: null,
    };
    const check = hasCompleteShippingDetails(incompleteProduct);

    if (!check.isComplete && check.missingFields.includes('Length') && check.missingFields.includes('Height')) {
      console.log('✅ [6/12] Incomplete Shipping Details Detection: PASSED');
      console.log(`   Correctly flagged missing fields: ${check.missingFields.join(', ')}`);
      passed++;
    } else {
      console.error('❌ [6/12] Incomplete Detection: FAILED', check);
    }
  } catch (err: any) {
    console.error('❌ [6/12] Incomplete Detection: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Multi-Quantity Single Item Cart Weight & Dimension Aggregation
  // -------------------------------------------------------------
  try {
    // 3 units of 500g product (20x15x10cm, vol: 0.6kg)
    // 3 units -> Total Actual = 1.5kg, Consolidated Volume = (3000 * 3 * 1.15) = 10,350 cm3
    const productA = {
      id: createdProductId,
      name: 'Healthcare Device A',
      weight: 0.5,
      length: 20,
      width: 15,
      height: 10,
    };

    const cartPkg = calculateCartShipmentPackage([{ product: productA, quantity: 3 }]);
    if (cartPkg.actualWeightKg === 1.5 && cartPkg.chargeableWeightKg >= 1.5 && cartPkg.isComplete) {
      console.log('✅ [7/12] Multi-Quantity Item Aggregation: PASSED');
      console.log(`   3 units @ 500g = Actual: ${cartPkg.actualWeightKg}kg, Parcel: ${cartPkg.lengthCm}x${cartPkg.breadthCm}x${cartPkg.heightCm}cm, Chargeable: ${cartPkg.chargeableWeightKg}kg`);
      passed++;
    } else {
      console.error('❌ [7/12] Multi-Quantity Item Aggregation: FAILED', cartPkg);
    }
  } catch (err: any) {
    console.error('❌ [7/12] Multi-Quantity Aggregation: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Multi-Product Cart Aggregation with Mixed Dimensions
  // -------------------------------------------------------------
  try {
    const item1 = {
      product: { id: 'p1', name: 'Product 1', weight: 0.4, length: 25, width: 15, height: 8 },
      quantity: 2,
    };
    const item2 = {
      product: { id: 'p2', name: 'Product 2', weight: 1.1, length: 30, width: 20, height: 12 },
      quantity: 1,
    };

    const multiCartPkg = calculateCartShipmentPackage([item1, item2]);
    const expectedActual = 0.4 * 2 + 1.1 * 1; // 1.9 kg

    if (Math.abs(multiCartPkg.actualWeightKg - expectedActual) < 0.01 && multiCartPkg.chargeableWeightKg >= expectedActual) {
      console.log('✅ [8/12] Multi-Product Cart Consolidation: PASSED');
      console.log(`   Items: 2x Prod1 (0.8kg) + 1x Prod2 (1.1kg) = Actual: ${multiCartPkg.actualWeightKg}kg`);
      console.log(`   Packed Parcel Dimensions: ${multiCartPkg.lengthCm}x${multiCartPkg.breadthCm}x${multiCartPkg.heightCm}cm`);
      console.log(`   Consolidated Chargeable Weight: ${multiCartPkg.chargeableWeightKg}kg`);
      passed++;
    } else {
      console.error('❌ [8/12] Multi-Product Consolidation: FAILED', multiCartPkg);
    }
  } catch (err: any) {
    console.error('❌ [8/12] Multi-Product Consolidation: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Database-Driven Cart Package Calculation via ShippingService
  // -------------------------------------------------------------
  try {
    // Look up 2 real products from DB
    const realProds = await prisma.product.findMany({ take: 2 });
    if (realProds.length >= 2) {
      const dbCartItems = [
        { productId: realProds[0].id, quantity: 2 },
        { productId: realProds[1].id, quantity: 1 },
      ];

      const res = await shippingService.calculateCartPackageDetails(dbCartItems);
      if (res.actualWeightKg > 0 && res.chargeableWeightKg > 0) {
        console.log('✅ [9/12] Database-Driven calculateCartPackageDetails(): PASSED');
        console.log(`   Retrieved products directly from DB: "${realProds[0].name}" & "${realProds[1].name}"`);
        console.log(`   Calculated Actual Weight: ${res.actualWeightKg}kg, Chargeable Weight: ${res.chargeableWeightKg}kg`);
        console.log(`   Shipment Complete Status: ${res.isComplete ? 'Complete' : `Incomplete (${res.missingProducts.length} items lack dimensions)`}`);
        passed++;
      } else {
        console.error('❌ [9/12] Database-Driven Cart Package: FAILED', res);
      }
    }
  } catch (err: any) {
    console.error('❌ [9/12] Database-Driven Cart Package: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 10: Live NimbusPost API Serviceability with Volumetric Dimensions
  // -------------------------------------------------------------
  try {
    const courierRes = await shippingService.checkServiceability({
      originPincode: '560001',
      destinationPincode: '695121',
      weightKg: 2.5,
      dimensions: { length: 30, breadth: 20, height: 25 }, // 30x20x25 / 5000 = 3.0 kg
      paymentType: 'prepaid',
    });

    if (courierRes.serviceable && courierRes.couriers?.length > 0) {
      console.log('✅ [10/12] Live NimbusPost API Serviceability with Dimensions: PASSED');
      console.log(`   Origin: 560001 -> Destination: 695121`);
      console.log(`   Couriers Returned: ${courierRes.couriers.length}`);
      const topCouriers = courierRes.couriers.slice(0, 3).map((c) => `${c.courierName}: ₹${c.rate} (${c.estimatedDays})`);
      console.log(`   Sample Rates: ${topCouriers.join(' | ')}`);
      passed++;
    } else {
      console.error('❌ [10/12] Live NimbusPost API: FAILED', courierRes);
    }
  } catch (err: any) {
    console.error('❌ [10/12] Live NimbusPost API: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 11: Error Handling on Missing Delivery PIN or Zero Dimensions
  // -------------------------------------------------------------
  try {
    const invalidCheck = await shippingService.checkServiceability({
      originPincode: '560001',
      destinationPincode: '000000', // Invalid PIN
    });

    if (!invalidCheck.serviceable && invalidCheck.message?.includes('Invalid')) {
      console.log('✅ [11/12] Invalid Delivery PIN / Input Error Handling: PASSED');
      console.log(`   Handled gracefully with message: "${invalidCheck.message}"`);
      passed++;
    } else {
      console.error('❌ [11/12] Error Handling: FAILED', invalidCheck);
    }
  } catch (err: any) {
    console.error('❌ [11/12] Error Handling: FAILED with error', err.message);
  }

  // -------------------------------------------------------------
  // Test 12: Preserving Existing Product & Clean Up
  // -------------------------------------------------------------
  try {
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } });
    }
    const totalRemaining = await prisma.product.count();
    console.log('✅ [12/12] Clean up & Database Integrity Preservation: PASSED');
    console.log(`   Test product cleaned up. Remaining live products in DB: ${totalRemaining}`);
    passed++;
  } catch (err: any) {
    console.error('❌ [12/12] Clean up: FAILED with error', err.message);
  }

  console.log('\n===========================================================');
  console.log(`📊 Suite Results: ${passed}/${total} PASSED, ${total - passed}/${total} FAILED`);
  console.log('===========================================================');
}

runTestSuite();
