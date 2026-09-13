import { PrismaClient } from "@prisma/client";
import "./env-validator";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In development, ensure HMR reloads pick up newly generated Prisma Client models
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = undefined;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    const instance = globalForPrisma.prisma;
    const value = instance[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  }
});

export default prisma;