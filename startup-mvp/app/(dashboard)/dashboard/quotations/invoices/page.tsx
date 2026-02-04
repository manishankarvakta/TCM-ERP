
import React from "react";
import { getInvoices } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import InvoicesListClient from "./_components/invoices-list-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

import { serializeData } from "@/lib/utils/serialization";

interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId ? await hasPermission(userId, "quotations.invoices", "view") : false;

  if (!canView) {
      return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const result = await getInvoices(page, 20, search, status);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading invoices"}
          </p>
        </div>
      </div>
    );
  }

  // Serialize Decimal objects for Client Components
  const serializedInvoices = serializeData(result.invoices || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage all your invoices</p>
        </div>
        <Link href="/dashboard/quotations/orders">
            <Button variant="outline" size="sm">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
            </Button>
        </Link>
      </div>

      <InvoicesListClient
        initialInvoices={serializedInvoices}
        initialPagination={result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }}
        initialSearch={search}
      />
    </div>
  );
}
