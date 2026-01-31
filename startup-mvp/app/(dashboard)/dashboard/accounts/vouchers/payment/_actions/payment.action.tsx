"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SupplierForPayment {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  supplierCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

/**
 * Get suppliers with their AP accounts for payment vouchers
 */
export async function getSuppliersForPayment(): Promise<{
  success: boolean;
  suppliers: SupplierForPayment[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", suppliers: [] };
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        supplierCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedSuppliers: SupplierForPayment[] = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      company: s.company,
      supplierCode: s.supplierCode,
      chartOfAccountId: s.chartOfAccountId,
      chartOfAccountName: s.ChartOfAccount?.name || null,
    }));

    return { success: true, suppliers: formattedSuppliers };
  } catch (error) {
    console.error("getSuppliersForPayment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suppliers",
      suppliers: [],
    };
  }
}

/**
 * Get supplier by ID with AP account
 */
export async function getSupplierById(supplierId: string): Promise<{
  success: boolean;
  supplier: SupplierForPayment | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", supplier: null };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        supplierCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!supplier) {
      return { success: false, error: "Supplier not found", supplier: null };
    }

    return {
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        company: supplier.company,
        supplierCode: supplier.supplierCode,
        chartOfAccountId: supplier.chartOfAccountId,
        chartOfAccountName: supplier.ChartOfAccount?.name || null,
      },
    };
  } catch (error) {
    console.error("getSupplierById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch supplier",
      supplier: null,
    };
  }
}
