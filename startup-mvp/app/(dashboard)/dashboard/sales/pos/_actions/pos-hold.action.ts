"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface POSHeldCartDto {
  id: string;
  cart: any[];
  clientId: string;
  amount: number;
}

/**
 * Fetch all held carts belonging to the currently logged in biller (userId)
 */
export async function getHeldCartsAction(): Promise<{
  success: boolean;
  data?: POSHeldCartDto[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const heldRecords = await prisma.pOSHeldCart.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const data: POSHeldCartDto[] = heldRecords.map((r) => ({
      id: r.holdKey,
      cart: Array.isArray(r.cart) ? (r.cart as any[]) : [],
      clientId: r.clientId || "",
      amount: Number(r.amount) || 0,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("getHeldCartsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load held carts",
    };
  }
}

/**
 * Save a new or existing held cart to the database for the current biller
 */
export async function saveHeldCartAction(heldCart: POSHeldCartDto): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.pOSHeldCart.findFirst({
      where: {
        userId: session.user.id,
        holdKey: heldCart.id,
      },
    });

    if (existing) {
      await prisma.pOSHeldCart.update({
        where: { id: existing.id },
        data: {
          cart: heldCart.cart,
          clientId: heldCart.clientId || null,
          amount: heldCart.amount,
        },
      });
    } else {
      await prisma.pOSHeldCart.create({
        data: {
          userId: session.user.id,
          holdKey: heldCart.id,
          cart: heldCart.cart,
          clientId: heldCart.clientId || null,
          amount: heldCart.amount,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("saveHeldCartAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save held cart",
    };
  }
}

/**
 * Delete a held cart from the database for the current biller
 */
export async function deleteHeldCartAction(holdKey: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.pOSHeldCart.deleteMany({
      where: {
        userId: session.user.id,
        holdKey: holdKey,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("deleteHeldCartAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete held cart",
    };
  }
}
