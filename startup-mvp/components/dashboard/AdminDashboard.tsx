"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { FiShield, FiZap, FiShoppingBag, FiDollarSign } from "react-icons/fi";
import FinancialOverview from "./widgets/admin/FinancialOverview";
import InventorySnapshot from "./widgets/admin/InventorySnapshot";
import ProductionStatus from "./widgets/admin/ProductionStatus";
import PurchasePayables from "./widgets/admin/PurchasePayables";
import SalesReceivables from "./widgets/admin/SalesReceivables";
import AlertsExceptions from "./widgets/admin/AlertsExceptions";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard({ userId }: { userId: string }) {
  const [permissions, setPermissions] = useState({
    canViewWholesale: false,
    canViewExpenses: false,
  });

  useEffect(() => {
    async function checkPerms() {
      try {
        const [canViewWholesale, canViewExpenses] = await Promise.all([
          hasPermission(userId, "sales.pos", "wholesale"),
          hasPermission(userId, "accounts.vouchers", "create"),
        ]);
        setPermissions({ canViewWholesale, canViewExpenses });
      } catch (err) {
        console.error("Failed to check permissions:", err);
      }
    }
    checkPerms();
  }, [userId]);

  return (
    <div className="flex-1 space-y-8 p-1 md:p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-black tracking-tighter text-primary uppercase">Executive Command</h2>
            <Badge variant="outline" className="h-6 gap-1 bg-primary/5 text-primary border-primary/20">
              <FiShield className="h-3 w-3" /> Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-bold italic tracking-tight">
            FashionFlow Garments Ltd • High-Level Enterprise Control
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

      {/* Primary Financial Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FinancialOverview />
        <QuickActionsWidget userId={userId} />
      </div>

      {/* Operations Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InventorySnapshot />
        <ProductionStatus />
        <SalesReceivables />
        <PurchasePayables />
        <AlertsExceptions />
      </div>
    </div>
  );
}
