import { Prisma } from "@prisma/client";

/**
 * Recursively converts Prisma Decimal objects to plain numbers
 * and ensures all objects are "plain" for Next.js Client Components.
 */
export function serializeData<T>(data: T): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as unknown as T;
  }

  // Handle Prisma Decimal
  if (data && typeof data === 'object') {
    const isDecimal = 
      data instanceof Prisma.Decimal || 
      (data.constructor && data.constructor.name === 'Decimal') ||
      (typeof (data as any).toNumber === 'function' && (data as any).d !== undefined) ||
      ((data as any).d !== undefined && (data as any).s !== undefined && (data as any).e !== undefined);
      
    if (isDecimal) {
      return Number(data) as unknown as T;
    }
  }

  // Handle Objects
  if (typeof data === "object") {
    // If it's a Date, keep it (Next.js handles Dates, or will stringify them)
    if (data instanceof Date) {
      return data as unknown as T;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data as any)) {
      result[key] = serializeData(value);
    }
    return result as T;
  }

  return data;
}
