import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProcurementsStats from "@/components/dashboard/procurements-stats";
import ProcurementStatusChart from "@/components/dashboard/procurement-status-chart";
import RecentProcurementsTable from "@/components/dashboard/recent-procurements-table";

export const metadata = {
  title: "Procurements Dashboard",
};

export default async function ProcurementsDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user role and default warehouse
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, defaultWarehouseId: true },
  });

  const warehouseFilter = dbUser?.role !== "admin" && dbUser?.defaultWarehouseId
    ? { warehouseId: dbUser.defaultWarehouseId }
    : {};

  const tpnWarehouseFilter = dbUser?.role !== "admin" && dbUser?.defaultWarehouseId
    ? { destinationWarehouseId: dbUser.defaultWarehouseId }
    : {};

  const purchaseWhere = { isTrash: false, ...warehouseFilter };
  const grnWhere = { isTrash: false, ...warehouseFilter };
  const rtvWhere = { ...warehouseFilter }; // RTV doesn't have isTrash currently based on schema
  const tpnWhere = { isTrash: false, ...tpnWarehouseFilter };

  // Fetch Purchases Data
  const [
    totalPurchases,
    pendingPurchases,
    completedPurchases,
    purchaseStatusGroup,
    recentPurchases,
  ] = await Promise.all([
    prisma.purchase.count({ where: purchaseWhere }),
    prisma.purchase.count({ where: { ...purchaseWhere, status: "DRAFT" } }), // Or PENDING if there was a pending status
    prisma.purchase.count({ where: { ...purchaseWhere, status: "RECEIVED" } }),
    prisma.purchase.groupBy({
      by: ["status"],
      where: purchaseWhere,
      _count: true,
    }),
    prisma.purchase.findMany({
      where: purchaseWhere,
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        purchaseNumber: true,
        status: true,
        grandTotal: true,
        date: true,
        supplier: {
          select: { name: true, company: true },
        },
      },
    }),
  ]);

  // Transform purchase status for chart
  const purchaseStatusBreakdown = purchaseStatusGroup.map((group) => ({
    status: group.status,
    count: group._count,
  }));

  // Fetch GRNs Data
  const [totalGRNs, recentGRNs] = await Promise.all([
    prisma.gRN.count({ where: grnWhere }),
    prisma.gRN.findMany({
      where: grnWhere,
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        grnNumber: true,
        status: true,
        date: true,
        warehouse: { select: { name: true } },
      },
    }),
  ]);

  // Fetch RTVs Data
  const [totalRTVs, recentRTVs] = await Promise.all([
    prisma.returnToVendor.count({ where: rtvWhere }),
    prisma.returnToVendor.findMany({
      where: rtvWhere,
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        rtvNumber: true,
        status: true,
        grandTotal: true,
        date: true,
        supplier: { select: { name: true, company: true } },
      },
    }),
  ]);

  // Fetch TPNs Data
  const [totalTPNs, recentTPNs] = await Promise.all([
    prisma.transferPurchaseNote.count({ where: tpnWhere }),
    prisma.transferPurchaseNote.findMany({
      where: tpnWhere,
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        tpnNumber: true,
        status: true,
        date: true,
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
      },
    }),
  ]);

  // Stats formatting
  const stats = {
    purchases: {
      total: totalPurchases,
      pending: pendingPurchases,
      completed: completedPurchases,
    },
    grns: {
      total: totalGRNs,
    },
    rtvs: {
      total: totalRTVs,
    },
    tpns: {
      total: totalTPNs,
    },
  };

  // Ensure plain objects for Server Components -> Client Components transition
  const serializedRecentPurchases = recentPurchases.map(p => ({
    ...p,
    grandTotal: Number(p.grandTotal)
  }));
  
  const serializedRecentRTVs = recentRTVs.map(r => ({
    ...r,
    grandTotal: Number(r.grandTotal)
  }));

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Procurements</h2>
          <p className="text-muted-foreground">
            Overview of all your purchasing activities.
          </p>
        </div>
      </div>

      <ProcurementsStats stats={stats} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RecentProcurementsTable
            purchases={serializedRecentPurchases}
            grns={recentGRNs}
            rtvs={serializedRecentRTVs}
            tpns={recentTPNs}
          />
        </div>
        <div className="col-span-3">
          <ProcurementStatusChart breakdown={purchaseStatusBreakdown} />
        </div>
      </div>
    </div>
  );
}
