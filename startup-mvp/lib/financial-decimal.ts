import { Prisma } from "@prisma/client";

/**
 * Standardized Decimal authority helpers ensuring exact financial arithmetic.
 */

export function toDecimal(val: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(val);
}

export function addDecimals(
  a: Prisma.Decimal | number | string | null | undefined, 
  b: Prisma.Decimal | number | string | null | undefined
): Prisma.Decimal {
  return toDecimal(a).add(toDecimal(b));
}

export function subtractDecimals(
  a: Prisma.Decimal | number | string | null | undefined, 
  b: Prisma.Decimal | number | string | null | undefined
): Prisma.Decimal {
  return toDecimal(a).sub(toDecimal(b));
}

export function multiplyDecimals(
  a: Prisma.Decimal | number | string | null | undefined, 
  b: Prisma.Decimal | number | string | null | undefined
): Prisma.Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

export function roundFinancialDecimal(dec: Prisma.Decimal, scale: number = 2): Prisma.Decimal {
  return dec.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP);
}

export const roundMoney = roundFinancialDecimal;

export function isDecimalEqual(
  a: Prisma.Decimal | number | string | null | undefined, 
  b: Prisma.Decimal | number | string | null | undefined
): boolean {
  const decA = roundFinancialDecimal(toDecimal(a));
  const decB = roundFinancialDecimal(toDecimal(b));
  return decA.equals(decB);
}
