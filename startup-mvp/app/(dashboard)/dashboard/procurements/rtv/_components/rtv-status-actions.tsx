"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FiCheck, FiX, FiClock } from "react-icons/fi";
import { approveAndCompleteReturnToVendor, cancelReturnToVendor } from "../_actions/rtv.action";
import type { ReturnToVendorStatus } from "@prisma/client";

interface RTVStatusActionsProps {
  rtvId: string;
  status: ReturnToVendorStatus;
}

export default function RTVStatusActions({ rtvId, status }: RTVStatusActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  if (status !== "DRAFT") {
    return null;
  }

  const handleApprove = async () => {
    startTransition(async () => {
      const result = await approveAndCompleteReturnToVendor(rtvId);
      if (result.success) {
        toast({
          title: "Return Completed",
          description: "RTV has been approved, stock deducted, and accounting voucher posted.",
        });
        setApproveDialogOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Approval Failed",
          description: result.error || "Failed to complete return",
          variant: "destructive",
        });
      }
    });
  };

  const handleCancel = async () => {
    startTransition(async () => {
      const result = await cancelReturnToVendor(rtvId);
      if (result.success) {
        toast({
          title: "Return Cancelled",
          description: "RTV has been marked as cancelled.",
        });
        setCancelDialogOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Cancellation Failed",
          description: result.error || "Failed to cancel return",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Approve & Complete Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            disabled={isPending}
          >
            <FiCheck className="mr-2 h-4 w-4" />
            {isPending ? "Processing..." : "Approve & Complete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Return to Vendor?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Approving this return will execute the following actions:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li>Deduct the returned quantities from the warehouse inventory stock.</li>
                <li>Generate and post an Accounts Payable journal voucher reducing the supplier balance.</li>
                <li>Mark the return status as <strong>COMPLETED</strong> (no further edits allowed).</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? "Completing..." : "Confirm & Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Return Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-destructive hover:text-destructive" disabled={isPending}>
            <FiX className="mr-2 h-4 w-4" />
            Cancel Return
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Return to Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this return? It will be marked as cancelled and cannot be approved later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isPending ? "Cancelling..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
