"use client";

import React, { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bulkUpdatePurchaseStatus } from "../_actions/purchase.action";
import { useToast } from "@/hooks/use-toast";
import { FiCheck, FiTruck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import type { PurchaseStatus } from "@prisma/client";

export default function PurchaseStatusActions({
  purchaseId,
  status,
  hasSupplier = true,
}: {
  purchaseId: string;
  status: PurchaseStatus;
  hasSupplier?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleUpdateStatus = async (newStatus: PurchaseStatus) => {
    startTransition(async () => {
      const result = await bulkUpdatePurchaseStatus([purchaseId], newStatus);
      if (result.success) {
        toast({
          title: "Success",
          description: `Purchase marked as ${newStatus.toLowerCase()}`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update purchase status",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      {status === "DRAFT" && (
        <Button
          onClick={() => handleUpdateStatus("APPROVED")}
          disabled={isPending || !hasSupplier}
          title={!hasSupplier ? "A supplier must be assigned before approving purchase" : undefined}
          className="bg-blue-600 hover:bg-blue-700 text-white mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiCheck className="mr-2 h-4 w-4" />
          {isPending ? "Approving..." : "Approve Purchase"}
        </Button>
      )}
      {(status === "APPROVED" || status === "PARTIALLY_RECEIVED") && (
        <Button
          onClick={() => router.push(`/dashboard/procurements/grn/add?purchaseId=${purchaseId}`)}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white mr-2"
        >
          <FiTruck className="mr-2 h-4 w-4" />
          Create GRN
        </Button>
      )}
    </>
  );
}
