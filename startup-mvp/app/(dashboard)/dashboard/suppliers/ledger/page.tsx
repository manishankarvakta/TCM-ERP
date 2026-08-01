import React from "react";
import { getSupplierLedger } from "../_actions/supplier.action";
import SupplierLedger from "../_components/supplierLedger";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface SupplierLedgerPageProps {
  searchParams: Promise<{
    id?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function SupplierLedgerPage({ searchParams }: SupplierLedgerPageProps) {
  const params = await searchParams;
  const supplierId = params.id;

  if (!supplierId) {
    notFound();
  }

  const [result, org] = await Promise.all([
    getSupplierLedger(supplierId, params.startDate, params.endDate),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

  if (!result.success || !result.supplier) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load supplier ledger"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="peoples.suppliers" requiredOperation="ledger">
      <SupplierLedger
        supplier={result.supplier}
        ledger={result.ledger || []}
        summary={result.summary || { totalPurchased: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 }}
        initialStartDate={params.startDate}
        initialEndDate={params.endDate}
        organization={org}
      />
    </PageGuard>
  );
}
