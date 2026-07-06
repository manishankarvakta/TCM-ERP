"use client";

import React, { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmGRN } from "../_actions/grn.action";
import { useToast } from "@/hooks/use-toast";
import { FiCheckSquare } from "react-icons/fi";
import { useRouter } from "next/navigation";
import type { GRNStatus } from "@prisma/client";

export default function GRNStatusActions({
  grnId,
  status,
}: {
  grnId: string;
  status: GRNStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleConfirmGRN = async () => {
    startTransition(async () => {
      const result = await confirmGRN(grnId);
      if (result.success) {
        toast({
          title: "Success",
          description: "GRN has been successfully confirmed and received.",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to confirm GRN",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      {status === "DRAFT" && (
        <Button
          onClick={handleConfirmGRN}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white mr-2"
        >
          <FiCheckSquare className="mr-2 h-4 w-4" />
          {isPending ? "Confirming..." : "Confirm & Receive"}
        </Button>
      )}
    </>
  );
}
