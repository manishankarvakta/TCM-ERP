/**
 * Calculate cost for one or more kitchen cabinet modules
 * Based on user-provided dimensions, unit, unit price, and quantity
 * 
 * Input dimensions in INCHES (standard for modular kitchens)
 */
export type AreaUnit = 'sqft' | 'sqm' | 'sqin';

export interface KitchenModuleInput {
  widthIn: number;   // cabinet width in inches
  depthIn: number;   // cabinet depth in inches
  heightIn: number;  // cabinet height in inches
  shelves?: number;  // internal shelves (default: 0)
  unit: AreaUnit;    // unit of the provided unitPrice (e.g. 'sqft')
  unitPrice: number; // price per [unit] (e.g. ₹1212 per sqft)
  qty: number;       // number of identical modules
}

export interface KitchenModuleOutput {
  input: KitchenModuleInput;
  perModule: {
    theoreticalArea: {
      sqin: number;
      sqft: number;
      sqm: number;
    };
    areaInSpecifiedUnit: number; // area converted to user's `unit`
    cost: number;                // cost per module
  };
  total: {
    areaInSpecifiedUnit: number;
    cost: number;
    modules: number;
  };
}

/**
 * Core calculation function
 */
export function calculateKitchenModule(input: KitchenModuleInput): KitchenModuleOutput {
  const { widthIn, depthIn, heightIn, shelves = 0, unit, unitPrice, qty } = input;

  // Validate
  if (widthIn <= 0 || depthIn <= 0 || heightIn <= 0) {
    throw new Error('Dimensions must be positive numbers (in inches)');
  }

  if (qty <= 0) {
    throw new Error('Quantity must be at least 1');
  }

  if (unitPrice < 0) {
    throw new Error('Unit price cannot be negative');
  }

  // --- Step 1: Calculate theoretical carcass area in SQUARE INCHES ---
  const topBottom = 2 * widthIn * depthIn;     // top + bottom
  const sides = 2 * depthIn * heightIn;        // left + right
  const back = widthIn * heightIn;             // back panel
  const shelfArea = shelves * widthIn * depthIn;
  const totalAreaSqIn = topBottom + sides + back + shelfArea;

  // --- Step 2: Convert to all area units ---
  const areaSqFt = totalAreaSqIn / 144;
  const areaSqM = areaSqFt * 0.09290304;

  // --- Step 3: Get area in user's specified unit ---
  let areaInSpecifiedUnit: number;
  switch (unit) {
    case 'sqin': areaInSpecifiedUnit = totalAreaSqIn; break;
    case 'sqft': areaInSpecifiedUnit = areaSqFt; break;
    case 'sqm': areaInSpecifiedUnit = areaSqM; break;
    default: throw new Error("Unit must be 'sqft', 'sqm', or 'sqin'");
  }

  // --- Step 4: Compute cost ---
  const costPerModule = areaInSpecifiedUnit * unitPrice;
  const totalCost = costPerModule * qty;
  const totalAreaInUnit = areaInSpecifiedUnit * qty;

  return {
    input,
    perModule: {
      theoreticalArea: {
        sqin: parseFloat(totalAreaSqIn.toFixed(2)),
        sqft: parseFloat(areaSqFt.toFixed(4)),
        sqm: parseFloat(areaSqM.toFixed(4)),
      },
      areaInSpecifiedUnit: parseFloat(areaInSpecifiedUnit.toFixed(4)),
      cost: parseFloat(costPerModule.toFixed(2)),
    },
    total: {
      areaInSpecifiedUnit: parseFloat(totalAreaInUnit.toFixed(4)),
      cost: parseFloat(totalCost.toFixed(2)),
      modules: qty,
    },
  };
}

