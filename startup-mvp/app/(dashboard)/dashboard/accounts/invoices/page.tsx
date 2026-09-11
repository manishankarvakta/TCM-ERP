import React from "react";
import { getInvoices } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus, FiArrowLeft, FiFileText } from "react-icons/fi";
import InvoicesListClient from "../../quotations/invoices/_components/invoices-list-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeData } from "@/lib/utils/serialization";

interface AccountsInvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AccountsInvoicesPage({ searchParams }: AccountsInvoicesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "view") ||
       await hasPermission(userId, "quotations.invoices", "view") ||
       await hasPermission(userId, "accounts.accounts-receivable", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const result = await getInvoices(page, 20, search, status);

  if (!result.success) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Invoices & Receivables Billing</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading accounts invoices"}
          </p>
        </div>
      </div>
    );
  }

  const serializedInvoices = serializeData(result.invoices || []).map((inv: any) => ({
    ...inv,
    order: inv.Order
      ? {
          ...inv.Order,
          client: inv.Order.Client,
        }
      : null,
  }));

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FiFileText className="h-6 w-6 text-primary" />
              Invoices & Billing (Receivables)
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage client billing, invoice payments, and automated revenue voucher posting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/accounts/accounts-receivable">
                AR Aging Report
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/quotations/orders">
                <FiPlus className="mr-2 h-4 w-4" />
                New Invoice from Order
              </Link>
            </Button>
          </div>
        </div>

        <InvoicesListClient
          initialInvoices={serializedInvoices}
          initialPagination={
            result.pagination || {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            }
          }
          initialSearch={search}
          initialStatus={status}
        />
      </div>
    </PageGuard>
  );
}
