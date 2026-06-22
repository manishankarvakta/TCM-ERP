"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { Prisma } from "@prisma/client";
import * as z from "zod";

const couponSchema = z.object({
  code: z.string().min(1, "Code is required").transform(val => val.trim().toUpperCase()),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.coerce.number().min(0, "Value must be positive"),
  expiryDate: z.preprocess((val) => {
    if (!val || val === "") return null;
    return new Date(val as string);
  }, z.date().nullable().optional()),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function getCoupons() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", coupons: [] };
    }

    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: {
            sales: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      coupons: coupons.map(c => ({
        ...c,
        value: Number(c.value),
        uses: c._count.sales,
      })),
    };
  } catch (error) {
    console.error("getCoupons error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch coupons",
      coupons: [],
    };
  }
}

export async function createCoupon(input: z.infer<typeof couponSchema>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", coupon: null };
    }

    const validated = couponSchema.parse(input);

    // Check if coupon code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return { success: false, error: "Coupon code already exists", coupon: null };
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: validated.code,
        discountType: validated.discountType,
        value: new Prisma.Decimal(validated.value),
        expiryDate: validated.expiryDate || null,
        status: validated.status,
      },
    });

    await logItemCreated(
      session.user.id,
      "Coupon",
      coupon.id,
      coupon.code,
      { code: coupon.code, value: Number(coupon.value) }
    );

    revalidateBothPaths("sales/coupons");

    return {
      success: true,
      coupon: {
        ...coupon,
        value: Number(coupon.value),
      },
    };
  } catch (error) {
    console.error("createCoupon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create coupon",
      coupon: null,
    };
  }
}

export async function updateCoupon(id: string, input: z.infer<typeof couponSchema>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", coupon: null };
    }

    const validated = couponSchema.parse(input);

    // Check if code exists on other coupons
    const existing = await prisma.coupon.findFirst({
      where: {
        code: validated.code,
        id: { not: id },
      },
    });

    if (existing) {
      return { success: false, error: "Coupon code is already in use by another coupon", coupon: null };
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: validated.code,
        discountType: validated.discountType,
        value: new Prisma.Decimal(validated.value),
        expiryDate: validated.expiryDate || null,
        status: validated.status,
      },
    });

    await logItemUpdated(
      session.user.id,
      "Coupon",
      coupon.id,
      ["code", "discountType", "value", "expiryDate", "status"],
      coupon.code,
      { code: coupon.code, value: Number(coupon.value) }
    );

    revalidateBothPaths("sales/coupons");

    return {
      success: true,
      coupon: {
        ...coupon,
        value: Number(coupon.value),
      },
    };
  } catch (error) {
    console.error("updateCoupon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update coupon",
      coupon: null,
    };
  }
}

export async function deleteCoupon(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const coupon = await prisma.coupon.delete({
      where: { id },
    });

    await logItemDeleted(
      session.user.id,
      "Coupon",
      coupon.id,
      coupon.code
    );

    revalidateBothPaths("sales/coupons");

    return { success: true };
  } catch (error) {
    console.error("deleteCoupon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete coupon",
    };
  }
}

export async function bulkUpdateCouponStatus(ids: string[], status: "ACTIVE" | "INACTIVE") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.coupon.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    for (const id of ids) {
      await logItemUpdated(
        session.user.id,
        "Coupon",
        id,
        ["status"],
        "Bulk Status Update",
        { status }
      );
    }

    revalidateBothPaths("sales/coupons");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateCouponStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update coupons status",
    };
  }
}

export async function bulkDeleteCoupons(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.coupon.deleteMany({
      where: { id: { in: ids } },
    });

    for (const id of ids) {
      await logItemDeleted(
        session.user.id,
        "Coupon",
        id,
        "Bulk Deleted"
      );
    }

    revalidateBothPaths("sales/coupons");

    return { success: true };
  } catch (error) {
    console.error("bulkDeleteCoupons error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete coupons",
    };
  }
}
