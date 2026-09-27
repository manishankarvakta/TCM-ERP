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
    purchaseSum,
    totalGRNs,
    recentGRNs,
    grnItems,
    totalRTVs,
    recentRTVs,
    rtvSum,
    totalTPNs,
    recentTPNs,
    tpnItems,
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
    prisma.purchase.aggregate({
      where: purchaseWhere,
      _sum: { grandTotal: true },
    }),
    // Fetch GRNs Data
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
    prisma.gRNItem.findMany({
      where: { grn: grnWhere },
      select: {
        receivedQuantity: true,
        purchaseItem: { select: { unitPrice: true } },
        variant: { select: { costPrice: true } },
        item: { select: { costPrice: true } },
      },
    }),
    // Fetch RTVs Data
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
    prisma.returnToVendor.aggregate({
      where: rtvWhere,
      _sum: { grandTotal: true },
    }),
    // Fetch TPNs Data
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
    prisma.transferPurchaseNoteItem.findMany({
      where: { tpn: tpnWhere },
      select: {
        quantity: true,
        variant: { select: { costPrice: true } },
        item: { select: { costPrice: true } },
      },
    }),
  ]);

  // Transform purchase status for chart
  const purchaseStatusBreakdown = purchaseStatusGroup.map((group) => ({
    status: group.status,
    count: group._count,
  }));

  // Calculate closing monetary values
  const purchasesTotalValue = Number(purchaseSum._sum.grandTotal || 0);

  const grnsTotalValue = grnItems.reduce((sum, item) => {
    const price = Number(
      item.purchaseItem?.unitPrice ?? item.variant?.costPrice ?? item.item?.costPrice ?? 0
    );
    return sum + (Number(item.receivedQuantity) * price);
  }, 0);

  const rtvsTotalValue = Number(rtvSum._sum.grandTotal || 0);

  const tpnsTotalValue = tpnItems.reduce((sum, item) => {
    const price = Number(item.variant?.costPrice ?? item.item?.costPrice ?? 0);
    return sum + (Number(item.quantity) * price);
  }, 0);

  // Stats formatting
  const stats = {
    purchases: {
      total: totalPurchases,
      pending: pendingPurchases,
      completed: completedPurchases,
      totalValue: purchasesTotalValue,
    },
    grns: {
      total: totalGRNs,
      totalValue: grnsTotalValue,
    },
    rtvs: {
      total: totalRTVs,
      totalValue: rtvsTotalValue,
    },
    tpns: {
      total: totalTPNs,
      totalValue: tpnsTotalValue,
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
