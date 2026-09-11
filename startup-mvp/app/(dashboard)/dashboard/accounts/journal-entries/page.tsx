import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeData } from "@/lib/utils/serialization";
import JournalEntriesListView from "./_components/journal-entries-list-view";

interface JournalEntriesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function JournalEntriesPage({ searchParams }: JournalEntriesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const search = params.search || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";

  const session = await auth();
  const userId = session?.user?.id;
  const orgId = (session?.user as any)?.organizationId;

  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "view") ||
       await hasPermission(userId, "accounts.ledgers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  // Build filters
  const whereFilter: any = {};
  if (orgId) {
    whereFilter.organizationId = orgId;
  }

  if (search) {
    whereFilter.OR = [
      { entryNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (dateFrom || dateTo) {
    whereFilter.date = {};
    if (dateFrom) whereFilter.date.gte = new Date(dateFrom);
    if (dateTo) whereFilter.date.lte = new Date(dateTo);
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: whereFilter,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        Voucher: {
          select: {
            id: true,
            voucherNumber: true,
            type: true,
          },
        },
        JournalEntryLine: {
          include: {
            ChartOfAccount: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
            Client: { select: { name: true } },
            Supplier: { select: { name: true } },
          },
        },
      },
    }),
    prisma.journalEntry.count({ where: whereFilter }),
  ]);

  const serializedEntries = serializeData(entries);

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal Entries Explorer</h1>
          <p className="text-sm text-muted-foreground">
            View immutable posted double-entry journal records and General Ledger audit trails
          </p>
        </div>

        <JournalEntriesListView
          initialEntries={serializedEntries}
          initialPagination={{
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }}
          initialSearch={search}
          initialDateFrom={dateFrom}
          initialDateTo={dateTo}
        />
      </div>
    </PageGuard>
  );
}
