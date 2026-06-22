"use client";

import { useEffect, useState } from "react";
import ProductionWidget from "./widgets/ProductionWidget";
import InventoryWidget from "./widgets/InventoryWidget";
import SalesWidget from "./widgets/SalesWidget";
import AccountsWidget from "./widgets/AccountsWidget";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import RecentActivity from "./recent-activity";
import { getUserActivity } from "@/app/actions/dashboard.action";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiLayout, FiZap, FiShoppingBag, FiDollarSign } from "react-icons/fi";

export default function UserDashboard({ userId }: { userId: string }) {
  const [permissions, setPermissions] = useState({
    canViewProduction: false,
    canViewInventory: false,
    canViewSales: false,
    canViewAccounts: false,
    canViewQuickActions: false,
    canViewRecentActivity: false,
    canViewWholesale: false,
    canViewExpenses: false,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const [
        canViewProduction,
        canViewInventory,
        canViewSales,
        canViewAccounts,
        canViewQuickActions,
        canViewRecentActivity,
        canViewWholesale,
        canViewExpenses,
        activityResult
      ] = await Promise.all([
        hasPermission(userId, "dashboard", "view_production_widget"),
        hasPermission(userId, "dashboard", "view_inventory_widget"),
        hasPermission(userId, "dashboard", "view_sales_widget"),
        hasPermission(userId, "dashboard", "view_accounts_widget"),
        hasPermission(userId, "dashboard", "view_quick_actions_widget"),
        hasPermission(userId, "dashboard", "view_recent_activity_widget"),
        hasPermission(userId, "sales.pos", "wholesale"),
        hasPermission(userId, "accounts.vouchers", "create"),
        getUserActivity(8)
      ]);

      setPermissions({
        canViewProduction,
        canViewInventory,
        canViewSales,
        canViewAccounts,
        canViewQuickActions,
        canViewRecentActivity,
        canViewWholesale,
        canViewExpenses,
      });
      
      if (activityResult) {
        setActivities(activityResult.activities || []);
      }
      
      setLoading(false);
    }
    loadDashboard();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded mb-8" />
        <div className="h-32 bg-muted rounded mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-[400px] bg-muted rounded" />
          <div className="h-[400px] bg-muted rounded" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-1 md:p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tighter text-primary uppercase">Staff Console</h2>
            <div className="h-6 px-2 flex items-center justify-center bg-primary/10 text-primary rounded border border-primary/20 text-[10px] font-black uppercase tracking-widest">
              Operations
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-bold italic tracking-tight">
            FashionFlow Garments Ltd • Production & Sales Operations
          </p>
        </div>
        
        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" asChild>
            <Link href="/dashboard/sales/pos">
              <FiZap className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
              <span>POS</span>
            </Link>
          </Button>

          {permissions.canViewWholesale && (
            <Button variant="outline" size="sm" className="gap-1.5 h-9" asChild>
              <Link href="/dashboard/sales/pos?mode=WHOLESALE">
                <FiShoppingBag className="h-4 w-4 text-purple-500" />
                <span>Wholesale</span>
              </Link>
            </Button>
          )}

          {permissions.canViewExpenses && (
            <Button variant="outline" size="sm" className="gap-1.5 h-9" asChild>
              <Link href="/dashboard/accounts/vouchers/expenses/add">
                <FiDollarSign className="h-4 w-4 text-amber-500" />
                <span>Expenses</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions at the top */}
      {permissions.canViewQuickActions && <QuickActionsWidget userId={userId} />}

      {/* Operational Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {permissions.canViewSales && <SalesWidget />}
        {permissions.canViewInventory && <InventoryWidget />}
        {permissions.canViewProduction && <ProductionWidget />}
        {permissions.canViewAccounts && <AccountsWidget />}

        {/* Recent Activity Card */}
        {permissions.canViewRecentActivity && (
          <div className="col-span-full">
            <RecentActivity activities={activities} />
          </div>
        )}
      </div>
    </div>
  );
}
