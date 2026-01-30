"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bulkUpdatePurchaseStatus } from "../_actions/purchase.action";
import { useToast } from "@/hooks/use-toast";
import { FiCheck, FiTruck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import type { PurchaseStatus } from "@prisma/client";

interface PurchaseStatusActionsProps {
  purchaseId: string;
  status: PurchaseStatus;
}

export default function PurchaseStatusActions({ purchaseId, status }: PurchaseStatusActionsProps) {
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

  if (status === "DRAFT") {
    return (
      <Button 
        onClick={() => handleUpdateStatus("APPROVED")} 
        disabled={isPending}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <FiCheck className="mr-2 h-4 w-4" />
        {isPending ? "Approving..." : "Approve Purchase"}
      </Button>
    );
  }

  if (status === "APPROVED") {
    return (
      <Button 
        onClick={() => handleUpdateStatus("RECEIVED")} 
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <FiTruck className="mr-2 h-4 w-4" />
        {isPending ? "Receiving..." : "Receive Goods"}
      </Button>
    );
  }

  return null;
}
