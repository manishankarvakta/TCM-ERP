/**
 * Safely stringifies objects containing Prisma Decimals, BigInts, and Dates
 * to prevent React Server-to-Client hydration errors.
 */
export function serializeDecimalAndDate<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives and BigInt
  if (typeof obj !== "object") {
    if (typeof obj === "bigint") {
      return obj.toString() as any;
    }
    return obj;
  }

  // Handle Arrays recursively
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDecimalAndDate(item)) as any;
  }

  // Handle Dates
  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  // Handle Prisma Decimal (which has a .constructor.name === "Decimal" or .d array)
  if (
    (obj as any).constructor?.name === "Decimal" ||
    (typeof (obj as any).toNumber === "function" && typeof (obj as any).toFixed === "function")
  ) {
    return (obj as any).toString();
  }

  // Handle plain objects recursively
  const serializedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serializedObj[key] = serializeDecimalAndDate((obj as any)[key]);
    }
  }

  return serializedObj;
}
