/**
 * Unit Converter Library for Area Units
 * Supports conversion between square meter, square millimeter, square inch, and square feet
 */

export type AreaUnit = "sqm" | "sqmm" | "sqin" | "sqft" | "rft";

export interface AreaUnitOption {
  value: AreaUnit;
  label: string;
}

export const AREA_UNIT_OPTIONS: AreaUnitOption[] = [
  { value: "sqm", label: "Square Meter" },
  { value: "sqmm", label: "Square Millimeter" },
  { value: "sqin", label: "Square Inch" },
  { value: "sqft", label: "Square Feet" },
];

// Restricted options for group items (sqm, sqft, and rft)
export const GROUP_BASE_UNIT_OPTIONS: AreaUnitOption[] = [
  { value: "sqm", label: "sqm" },
  { value: "sqft", label: "sqft" },
  { value: "rft", label: "rft (Running Meter)" },
];

/**
 * Conversion factors to square meters (base unit)
 * 1 square meter = X of the unit
 */
const AREA_TO_SQUARE_METER: Record<AreaUnit, number> = {
  sqm: 1, // 1 square meter = 1 square meter
  sqmm: 0.000001, // 1 square millimeter = 0.000001 square meters
  sqin: 0.00064516, // 1 square inch = 0.00064516 square meters
  sqft: 0.092903, // 1 square foot = 0.092903 square meters
  rft: 1, // 1 running meter = 1 meter (linear, not area - handled separately)
};

/**
 * Convert area from one unit to another
 */
export function convertAreaUnit(
  value: number,
  fromUnit: AreaUnit,
  toUnit: AreaUnit
): number {
  if (fromUnit === toUnit) {
    return value;
  }

  // Convert to square meters first (base unit)
  const valueInSqm = convertToSquareMeter(value, fromUnit);
  // Convert from square meters to target unit
  return convertFromSquareMeter(valueInSqm, toUnit);
}

/**
 * Convert area value to square meters
 */
export function convertToSquareMeter(
  value: number,
  fromUnit: AreaUnit
): number {
  const factor = AREA_TO_SQUARE_METER[fromUnit];
  return value * factor;
}

/**
 * Convert area value from square meters to target unit
 */
export function convertFromSquareMeter(
  value: number,
  toUnit: AreaUnit
): number {
  const factor = AREA_TO_SQUARE_METER[toUnit];
  return value / factor;
}

/**
 * Calculate unit price from base unit price and dimensions
 * 
 * @param baseUnit - The area unit for baseUnitPrice (sqm, sqmm, sqin, sqft)
 * @param baseUnitPrice - Price per unit of baseUnit
 * @param height - Height dimension (defaults to 1)
 * @param width - Width dimension (defaults to 1)
 * @param depth - Depth dimension (defaults to 1)
 * @returns Calculated unit price
 */
export interface CalculateUnitPriceInput {
  baseUnit: AreaUnit;
  baseUnitPrice: number;
  height?: number;
  width?: number;
  depth?: number;
}

export function calculateUnitPriceFromBase({
  baseUnit,
  baseUnitPrice,
  height = 1,
  width = 1,
  depth = 1,
}: CalculateUnitPriceInput): number {
  // Ensure dimensions are positive numbers, default to 1
  const h = Math.max(1, height || 1);
  const w = Math.max(1, width || 1);
  const d = Math.max(1, depth || 1);

  // Calculate surface area in square meters
  // Surface area = 2*(H*D) + 2*(W*D) + (H*W)
  const areaSqm = 2 * (h * d) + 2 * (w * d) + (h * w);

  // Convert baseUnitPrice to price per square meter
  const baseUnitPricePerSqm = convertToSquareMeter(baseUnitPrice, baseUnit);

  // Calculate total price for the surface area
  const totalPrice = areaSqm * baseUnitPricePerSqm;

  // Return unit price (total price for the item)
  return totalPrice;
}

/**
 * Length unit types (for unit field)
 */
export type LengthUnit = "m" | "ft" | "in" | "mm";

/**
 * Conversion factors from length units to meters
 */
const LENGTH_TO_METER: Record<LengthUnit, number> = {
  m: 1,
  ft: 0.3048,
  in: 0.0254,
  mm: 0.001,
};

/**
 * Convert base area unit price to target unit area price.
 * 
 * @param baseUnit - Area unit (sqm, sqft, or rft)
 * @param baseUnitPrice - Price per area unit (or per running meter for rft)
 * @param unit - Target length unit (ft, in, mm, m). This implies square-units for pricing (sqft, sqin, sqmm, sqm) or linear for rft.
 * @returns Price per square of the selected unit (sqft/sqin/sqmm/sqm) or per linear unit if baseUnit is rft.
 * 
 * Examples:
 * - base=100 per sqm, unit=ft => 100 per sqm = 100*0.092903 per sqft = 9.2903 per sqft
 * - base=100 per sqft, unit=m  => 100 per sqft = 100/0.092903 per sqm = 1076.39 per sqm
 * - base=100 per rft, unit=m   => 100 per running meter = 100 per meter
 * - base=100 per rft, unit=ft  => 100 per running meter = 100/0.3048 per running foot = 328.08 per running foot
 */
export function convertAreaPriceToLengthPrice(
  baseUnit: "sqm" | "sqft" | "rft",
  baseUnitPrice: number,
  unit: LengthUnit
): number {
  // Handle rft (running meter) as linear unit
  if (baseUnit === "rft") {
    // Convert price per running meter to price per running unit
    // If baseUnitPrice is per meter, and we want per unit:
    // price per unit = price per meter / (meters per unit)
    // Example: 100 per meter, unit=ft => 100 / 0.3048 = 328.08 per foot
    const lengthFactor = LENGTH_TO_METER[unit];
    return baseUnitPrice / lengthFactor; // For linear: price per meter / meters per unit = price per unit
  }

  // Handle area units (sqm, sqft)
  // Normalize to price per square meter (sqm) first.
  // 1 sqft = 0.092903 sqm
  const pricePerSqm =
    baseUnit === "sqm" ? baseUnitPrice : baseUnitPrice / 0.092903;

  // Convert price per sqm to price per square of the selected unit:
  // Since 1 unit = lengthFactor meters, then 1 unit^2 = (lengthFactor^2) m^2,
  // so pricePerSqUnit = pricePerSqm * (lengthFactor^2).
  const lengthFactor = LENGTH_TO_METER[unit];
  const areaFactor = lengthFactor * lengthFactor;
  return pricePerSqm * areaFactor;
}

/**
 * Calculate surface area in a given length unit
 * 
 * @param height - Height dimension
 * @param width - Width dimension
 * @param depth - Depth dimension
 * @param unit - Length unit (m, ft, in, mm)
 * @returns Surface area in the specified unit
 */
export function calculateSurfaceArea(
  height: number,
  width: number,
  depth: number,
  unit: LengthUnit
): number {
  // Convert dimensions to meters
  const factor = LENGTH_TO_METER[unit];
  const h = height * factor;
  const w = width * factor;
  const d = depth * factor;
  
  // Calculate surface area in square meters
  // Surface area = 2*(H*D) + 2*(W*D) + (H*W)
  const areaSqm = 2 * (h * d) + 2 * (w * d) + (h * w);
  
  // Convert to target unit (divide by area factor)
  const areaFactor = factor * factor;
  const areaInUnit = areaSqm / areaFactor;
  return areaInUnit;
}

