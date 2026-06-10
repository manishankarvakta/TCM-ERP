import React from "react";
import { notFound } from "next/navigation";
import { getTPNById } from "../_actions/tpn.action";
import TpnDetails from "../_components/tpn-details";
import PageGuard from "@/components/permissions/page-guard";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TpnDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getTPNById(id);

  if (!result.success || !result.data) {
    if (result.error === "Failed to load TPN") {
      notFound();
    }
    return (
       <div className="p-8 text-center text-red-500">
          Error loading TPN: {result.error}
       </div>
    );
  }

  return (
    <PageGuard permissionKey="procurements.tpn" requiredOperation="view">
      <div className="flex-1 space-y-4">
        <TpnDetails tpn={result.data} />
      </div>
    </PageGuard>
  );
}
