import { Suspense } from "react";
import { Metadata } from "next";
import PageGuard from "@/components/permissions/page-guard";
import BonusesClient from "./_components/bonuses-client";
import { getBonuses } from "./_actions/bonus.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { BonusStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Bonuses & Rewards | HRMS",
  description: "Manage custom employee bonuses and rewards",
};

interface BonusesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    tab?: string;
  }>;
}

export default async function BonusesPage({ searchParams }: BonusesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = (params.status as BonusStatus) || "ALL";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const [res, canCreate, canApprove, canDelete] = await Promise.all([
    getBonuses(page, 10, search, status, tab),
    userId ? hasPermission(userId, "hr.bonuses", "create") : false,
    userId ? hasPermission(userId, "hr.bonuses", "approve") : false,
    userId ? hasPermission(userId, "hr.bonuses", "delete-permanently") : false,
  ]);

  return (
    <PageGuard permissionKey="hr.bonuses">
      <Suspense fallback={<div className="p-6">Loading bonuses...</div>}>
        <BonusesClient
          initialBonuses={(res.bonuses as any) || []}
          pagination={res.pagination}
          currentSearch={search}
          currentStatus={status}
          currentTab={tab}
          permissions={{
            canCreate,
            canApprove,
            canDelete,
          }}
        />
      </Suspense>
    </PageGuard>
  );
}
