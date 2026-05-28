"use client";

import React, { useRef, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { bulkUpdatePurchaseStatus } from "../_actions/purchase.action";
import { useToast } from "@/hooks/use-toast";
import { FiCheck, FiTruck } from "react-icons/fi";
import { useRouter } from "next/navigation";
import type { PurchaseStatus } from "@prisma/client";

// Printable component for purchase details (placeholder implementation)
const PrintPurchase = React.forwardRef<HTMLDivElement, { purchaseId: string }>((props, ref) => (
  <div ref={ref} style={{ padding: "20px" }}>
    <h2>Purchase Details</h2>
    <p>Purchase ID: {props.purchaseId}</p>
    {/* Additional purchase details can be added here */}
  </div>
));
PrintPurchase.displayName = "PrintPurchase";

export default function PurchaseStatusActions({
  purchaseId,
  status,
}: {
  purchaseId: string;
  status: PurchaseStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  // Print handling
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Purchase_${purchaseId}`,
  });

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
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white mr-2"
        >
          <FiCheck className="mr-2 h-4 w-4" />
          {isPending ? "Approving..." : "Approve Purchase"}
        </Button>
      )}
      {status === "APPROVED" && (
        <Button
          onClick={() => handleUpdateStatus("RECEIVED")}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white mr-2"
        >
          <FiTruck className="mr-2 h-4 w-4" />
          {isPending ? "Receiving..." : "Receive Goods"}
        </Button>
      )}
      {/* Print button – available for any status */}
      <Button onClick={handlePrint} disabled={isPending} className="bg-gray-600 hover:bg-gray-700 text-white">
        Print Purchase
      </Button>
      {/* Hidden printable component */}
      <div style={{ display: "none" }}>
        <PrintPurchase ref={printRef} purchaseId={purchaseId} />
      </div>
    </>
  );
}
