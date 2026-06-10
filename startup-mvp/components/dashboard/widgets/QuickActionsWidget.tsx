"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FiPackage, 
  FiUsers, 
  FiShoppingCart, 
  FiFileText, 
  FiPlus, 
  FiLayers, 
  FiActivity,
  FiZap
} from "react-icons/fi";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default function QuickActionsWidget({ userId }: { userId: string }) {
  const [permissions, setPermissions] = useState<any>({
    canCreateItem: false,
    canCreateClient: false,
    canCreateSupplier: false,
    canCreateSale: false,
    canCreatePurchase: false,
    canCreateBOM: false,
    canCreateProductionOrder: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPerms() {
      const [
        canCreateItem,
        canCreateClient,
        canCreateSupplier,
        canCreateSale,
        canCreatePurchase,
        canCreateBOM,
        canCreateProductionOrder
      ] = await Promise.all([
        hasPermission(userId, 'master.items', 'create'),
        hasPermission(userId, 'peoples.clients', 'create'),
        hasPermission(userId, 'peoples.suppliers', 'create'),
        hasPermission(userId, 'sales.sales', 'create'),
        hasPermission(userId, 'procurements.purchases', 'create'),
        hasPermission(userId, 'production.boms', 'create'),
        hasPermission(userId, 'production.orders', 'create'),
      ]);

      setPermissions({
        canCreateItem,
        canCreateClient,
        canCreateSupplier,
        canCreateSale,
        canCreatePurchase,
        canCreateBOM,
        canCreateProductionOrder,
      });
      setLoading(false);
    }
    checkPerms();
  }, [userId]);

  if (loading) return null;

  const hasAnyAction = Object.values(permissions).some(p => p === true);
  if (!hasAnyAction) return null;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FiZap className="h-5 w-5 fill-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Kitchen & Front Desk Quick Actions</CardTitle>
            <CardDescription>Commonly used operations for daily management</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {permissions.canCreateSale && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-emerald-500/5 hover:text-emerald-600 hover:border-emerald-500/30 transition-all group" asChild>
              <Link href="/dashboard/sales/pos">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <FiZap className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">POS Sale</span>
              </Link>
            </Button>
          )}

          {permissions.canCreateProductionOrder && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-amber-500/5 hover:text-amber-600 hover:border-amber-500/30 transition-all group" asChild>
              <Link href="/dashboard/production/orders/add">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <FiActivity className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Production</span>
              </Link>
            </Button>
          )}

          {permissions.canCreateItem && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/30 transition-all group" asChild>
              <Link href="/dashboard/master/items/add">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <FiPackage className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Item</span>
              </Link>
            </Button>
          )}

          {permissions.canCreatePurchase && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-rose-500/5 hover:text-rose-600 hover:border-rose-500/30 transition-all group" asChild>
              <Link href="/dashboard/procurements/purchases/add">
                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <FiShoppingCart className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Purchase</span>
              </Link>
            </Button>
          )}

          {permissions.canCreateBOM && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-purple-500/5 hover:text-purple-600 hover:border-purple-500/30 transition-all group" asChild>
              <Link href="/dashboard/production/boms/add">
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <FiLayers className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Recipe</span>
              </Link>
            </Button>
          )}

          {permissions.canCreateClient && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-cyan-500/5 hover:text-cyan-600 hover:border-cyan-500/30 transition-all group" asChild>
              <Link href="/dashboard/clients/add">
                <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                  <FiUsers className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Client</span>
              </Link>
            </Button>
          )}

          {permissions.canCreateSupplier && (
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-orange-500/5 hover:text-orange-600 hover:border-orange-500/30 transition-all group" asChild>
              <Link href="/dashboard/suppliers/add">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <FiUsers className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">New Supplier</span>
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
