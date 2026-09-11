import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { listVouchers } from "./_actions/voucher.action";
import VouchersListClient from "./_components/vouchers-list";
import VoucherQuickActions from "./_components/voucher-quick-actions";
import { serializeData } from "@/lib/utils/serialization";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

interface VouchersPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    type?: string;
    tab?: string;
  }>;
}

export default async function VouchersPage({ searchParams }: VouchersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "10", 10);
  const search = params.search || "";
  const tab = params.tab || params.status || "all";
  const type = params.type || "";

  const statusParam = (tab === "draft" || tab === "posted" || tab === "cancelled") ? tab : "all";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "read") ||
       await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  const canCreate = userId
    ? (await hasPermission(userId, "accounts.vouchers", "create") ||
       await hasPermission(userId, "accounts.vouchers", "manage"))
    : false;

  const canEdit = userId
    ? (await hasPermission(userId, "accounts.vouchers", "edit") ||
       await hasPermission(userId, "accounts.vouchers", "manage"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const result = await listVouchers(page, limit, search, statusParam as any, type);

  const vouchers = result.success ? serializeData(result.vouchers || []) : [];
  const pagination = result.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  };

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Accounting Vouchers</h1>
            <p className="text-sm text-muted-foreground">
              Draft, review, post, and track double-entry vouchers across Payment, Receipt, Journal, and Contra workflows
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/accounts/vouchers/create">
                <FiPlus className="mr-2 h-4 w-4" />
                Create Custom Voucher
              </Link>
            </Button>
          )}
        </div>

        {/* Quick Voucher Templates */}
        <VoucherQuickActions />

        {/* Vouchers Table */}
        <VouchersListClient
          initialVouchers={vouchers}
          initialPagination={pagination}
          initialSearch={search}
          permissions={{
            view: canView,
            create: canCreate,
            edit: canEdit,
          }}
        />
      </div>
    </PageGuard>
  );
}
