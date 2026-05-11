import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDashboardStats,
  getSystemActivity,
} from "@/app/actions/dashboard.action";
import AdminDashboardStats from "@/components/admin/admin-dashboard-stats";
import RecentActivity from "@/components/admin/recent-activity";
import ProductionWidget from "@/components/dashboard/widgets/ProductionWidget";
import InventoryWidget from "@/components/dashboard/widgets/InventoryWidget";
import SalesWidget from "@/components/dashboard/widgets/SalesWidget";
import AccountsWidget from "@/components/dashboard/widgets/AccountsWidget";
import QuickActionsWidget from "@/components/dashboard/widgets/QuickActionsWidget";
import { hasPermission } from "@/lib/permissions";

export default async function AdminDashboardPage() {
  const session = await auth();

  // Check if user has valid session
  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  const userId = session.user.id;

  // Fetch admin-specific dashboard data
  const [
    statsResult,
    activityResult,
    canViewProduction,
    canViewInventory,
    canViewSales,
    canViewAccounts,
  ] = await Promise.all([
    getDashboardStats(),
    getSystemActivity(10),
    hasPermission(userId, "production.orders", "view"),
    hasPermission(userId, "inventory.stock", "view"),
    hasPermission(userId, "sales.sales", "view"),
    hasPermission(userId, "accounts.vouchers", "view"),
  ]);

  return (
    <div className="flex-1 space-y-6 p-1 md:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">System Administration</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Global overview of FashionFlow Garments Ltd operations
          </p>
        </div>
      </div>

      {/* Admin Statistics Cards */}
      <AdminDashboardStats stats={statsResult.success ? statsResult.stats : null} />

      {/* Quick Actions */}
      <QuickActionsWidget userId={userId} />

      {/* Operational Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {canViewSales && <SalesWidget />}
        {canViewInventory && <InventoryWidget />}
        {canViewProduction && <ProductionWidget />}
        {canViewAccounts && <AccountsWidget />}

        {/* System Activity */}
        <div className="col-span-full">
          {activityResult.success ? (
            <RecentActivity activities={activityResult.activities} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-destructive border rounded-lg bg-destructive/5">
              {activityResult.error || "Failed to load recent activity"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
