import { Suspense } from "react";
import { Metadata } from "next";
import PageGuard from "@/components/permissions/page-guard";
import FinesClient from "./_components/fines-client";
import { getFines } from "./_actions/fine.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { FineStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Fines & Penalties | HRMS",
  description: "Manage custom employee fines and penalties",
};

interface FinesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    tab?: string;
  }>;
}

export default async function FinesPage({ searchParams }: FinesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = (params.status as FineStatus) || "ALL";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const [res, canCreate, canApprove, canDelete] = await Promise.all([
    getFines(page, 10, search, status, tab),
    userId ? hasPermission(userId, "hr.fines", "create") : false,
    userId ? hasPermission(userId, "hr.fines", "approve") : false,
    userId ? hasPermission(userId, "hr.fines", "delete-permanently") : false,
  ]);

  return (
    <PageGuard permissionKey="hr.fines">
      <Suspense fallback={<div className="p-6">Loading fines...</div>}>
        <FinesClient
          initialFines={(res.fines as any) || []}
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
