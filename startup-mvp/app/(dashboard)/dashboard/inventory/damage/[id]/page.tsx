import React from "react";
import { getDamage } from "../_actions/damage.action";
import DamageDetails from "./_components/damage-details";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function DamageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  const userId = session?.user?.id || "";

  const [result, canEdit, canApprove, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getDamage(resolvedParams.id),
    userId ? hasPermission(userId, "inventory.damage", "edit") : false,
    userId ? hasPermission(userId, "inventory.damage", "approve") : false,
    userId ? hasPermission(userId, "inventory.damage", "move-to-trash") : false,
    userId ? hasPermission(userId, "inventory.damage", "delete-permanently") : false,
  ]);

  if (!result.success || !result.damage) {
    console.error("Failed to load damage:", result);
    return notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DamageDetails 
        initialData={result.damage} 
        userId={userId || undefined}
        permissions={{
          edit: canEdit,
          approve: canApprove,
          moveToTrash: canMoveToTrash,
          deletePermanently: canDeletePermanently,
        }}
      />
    </div>
  );
}
