"use client";

import FinancialOverview from "./widgets/admin/FinancialOverview";
import InventorySnapshot from "./widgets/admin/InventorySnapshot";
import ProductionStatus from "./widgets/admin/ProductionStatus";
import PurchasePayables from "./widgets/admin/PurchasePayables";
import SalesReceivables from "./widgets/admin/SalesReceivables";
import AlertsExceptions from "./widgets/admin/AlertsExceptions";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import { Badge } from "@/components/ui/badge";
import { FiShield } from "react-icons/fi";

export default function AdminDashboard({ userId }: { userId: string }) {
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
