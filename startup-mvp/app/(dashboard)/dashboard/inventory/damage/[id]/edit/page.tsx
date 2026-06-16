import React from "react";
import { getWarehouses } from "../../../../master/warehouses/_actions/warehouse.action";
import { getActiveItems } from "../../../stock/_actions/stock.action";
import { getDamage } from "../../_actions/damage.action";
import DamageForm from "../../add/_components/damage-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export default async function EditDamagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await auth();
  const userContext = { isNormalUser: false, defaultWarehouseId: null as string | null };

  if (session?.user) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });
    if (u && u.role !== "admin" && u.role !== "superadmin") {
      userContext.isNormalUser = true;
      userContext.defaultWarehouseId = u.defaultWarehouseId;
    }
  }

  const damageRes = await getDamage(resolvedParams.id);

  if (!damageRes.success || !damageRes.damage) {
    return notFound();
  }

  if (damageRes.damage.status !== "DRAFT" || damageRes.damage.isTrash) {
    return redirect(`/dashboard/inventory/damage/${resolvedParams.id}`);
  }

  const [warehousesRes, itemsRes] = await Promise.all([
    getWarehouses(1, 100),
    getActiveItems()
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/inventory/damage/${resolvedParams.id}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Edit Damage Record</h1>
          <p className="text-sm text-muted-foreground">Modify draft damage record details.</p>
        </div>
      </div>

      <DamageForm 
        warehouses={warehousesRes.success ? warehousesRes.warehouses : []}
        items={itemsRes.success ? itemsRes.items : []}
        userContext={userContext}
        initialData={damageRes.damage}
      />
    </div>
  );
}
