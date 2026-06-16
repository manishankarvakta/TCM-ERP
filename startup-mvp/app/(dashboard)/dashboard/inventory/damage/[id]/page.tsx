import React from "react";
import { getDamage } from "../_actions/damage.action";
import DamageDetails from "./_components/damage-details";
import { notFound } from "next/navigation";

export default async function DamageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const result = await getDamage(resolvedParams.id);

  if (!result.success || !result.damage) {
    console.error("Failed to load damage:", result);
    return notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DamageDetails initialData={result.damage} />
    </div>
  );
}
