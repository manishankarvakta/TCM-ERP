import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).employeeRoster) {
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}