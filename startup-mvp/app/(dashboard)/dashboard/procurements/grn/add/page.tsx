import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreateGRNForm from "../_components/create-grn-form";
import { Button } from "@/components/ui/button";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { getPreferencesAction } from "@/app/(dashboard)/dashboard/settings/_actions/preferences.action";
import { auth } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<{ purchaseId?: string; tpnId?: string }>;
}

export default async function CreateGRNPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const purchaseId = resolvedSearchParams.purchaseId;
  const tpnId = resolvedSearchParams.tpnId;

  const session = await auth();
  let userDefaultWarehouseId = null;
  let isNormalUser = true;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultWarehouseId: true, role: true }
    });
    userDefaultWarehouseId = user?.defaultWarehouseId || null;
    isNormalUser = user?.role !== "admin" && user?.role !== "ADMIN" && user?.role !== "super_admin";
  }

  // Fetch base requirements
  const warehouses = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    select: { id: true, name: true, code: true }
  });

  const preferencesResult = await getPreferencesAction();
  const allowPurchaseSelect = preferencesResult.success && preferencesResult.preferences?.createPurchaseWithoutGRN;

  let initialPurchase = null;
  let initialTpn = null;

  if (purchaseId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: {
          select: { name: true, email: true },
        },
        items: {
          where: { itemId: { not: null } },
          include: {
            item: true,
            variant: true,
          }
        },
      },
    });

    if (purchase && (purchase.status === "APPROVED" || purchase.status === "PARTIALLY_RECEIVED")) {
      initialPurchase = {
        ...purchase,
        items: purchase.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          receivedQuantity: Number(item.receivedQuantity),
          unitPrice: Number(item.unitPrice),
        })),
      };
    }
  } else if (tpnId) {
    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id: tpnId },
      include: {
        sourceWarehouse: true,
        items: {

          include: {
            item: true,
            variant: true,
          }
        },
      },
    });

    if (tpn && tpn.status === "SHIPPED") {
      initialTpn = {
        ...tpn,
        items: tpn.items.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity),
        })),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/procurements/grn`}>
          <Button variant="outline" size="icon">
            <FiArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create GRN</h1>
      </div>

      <CreateGRNForm 
        warehouses={warehouses}
        allowPurchaseSelect={!!allowPurchaseSelect}
        initialPurchase={initialPurchase}
        initialTpn={initialTpn}
        userDefaultWarehouseId={userDefaultWarehouseId}
        isNormalUser={isNormalUser}
      />
    </div>
  );
}
