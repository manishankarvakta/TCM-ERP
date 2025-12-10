export type SupportedUnit = "m" | "ft" | "in" | "mm";

export interface CalculatorInput {
  unitPricePerSqm: number;
  unit: SupportedUnit;
  height: number;
  width: number;
  depth: number;
}

export interface CalculatorOutput {
  areaInUnit: number;
  unitPrice: number;
  totalPrice: number;
}

const lengthToMeter: Record<SupportedUnit, number> = {
  m: 1,
  ft: 0.3048,
  in: 0.0254,
  mm: 0.001
};

export function calculateSurfacePrice({
  unitPricePerSqm,
  unit,
  height,
  width,
  depth
}: CalculatorInput): CalculatorOutput {
  
  const factor = lengthToMeter[unit];

  const Hm = height * factor;
  const Wm = width * factor;
  const Dm = depth * factor;

  const areaSqm =
    Hm * Dm * 2 +
    Wm * Dm * 2 +
    Hm * Wm;

  const areaFactor = factor * factor;

  const areaInUnit = areaSqm / areaFactor;
  const unitPrice = unitPricePerSqm * areaFactor;
  const totalPrice = areaInUnit * unitPrice;

  return {
    areaInUnit,
    unitPrice,
    totalPrice
  };
}
