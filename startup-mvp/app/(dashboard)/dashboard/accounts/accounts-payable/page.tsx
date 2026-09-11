import React from "react";
import { getAccountsPayable } from "../reports/_actions/ar-ap.action";
import APView from "./_components/ap-view";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeData } from "@/lib/utils/serialization";

interface AccountsPayablePageProps {
  searchParams: Promise<{
    date?: string;
    aging?: string;
  }>;
}

export default async function AccountsPayablePage({ searchParams }: AccountsPayablePageProps) {
  const params = await searchParams;
  const dateParam = params.date || "";
  const includeAging = params.aging === "true";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.accounts-payable", "read") ||
       await hasPermission(userId, "accounts.accounts-payable", "view") ||
       await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const asOfDate = dateParam ? new Date(dateParam) : new Date();
  const result = await getAccountsPayable(asOfDate, includeAging);

  if (!result.success) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Accounts Payable</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading accounts payable"}
          </p>
        </div>
      </div>
    );
  }

  const serializedSuppliers = serializeData(result.suppliers || []);

  return (
    <PageGuard permissionKey="accounts.accounts-payable">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts Payable (AP)</h1>
          <p className="text-sm text-muted-foreground">
            Track supplier outstanding balances, vendor transaction ledgers, and aging schedules
          </p>
        </div>

        <APView
          initialSuppliers={serializedSuppliers}
          initialTotal={result.total || 0}
          asOfDate={result.asOfDate || asOfDate}
          dateParam={dateParam}
          initialIncludeAging={includeAging}
        />
      </div>
    </PageGuard>
  );
}
