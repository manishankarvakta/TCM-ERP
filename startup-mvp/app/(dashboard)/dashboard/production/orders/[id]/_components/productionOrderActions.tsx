"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiPlay, FiCheck, FiX } from "react-icons/fi";
import { startProductionOrder, completeProductionOrder, cancelProductionOrder } from "../../_actions/production.action";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { ProductionOrderStatus } from "@prisma/client";

interface ProductionOrder {
  id: string;
  code: string;
  status: ProductionOrderStatus;
}

interface ProductionOrderActionsProps {
  order: ProductionOrder;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
}

export default function ProductionOrderActions({
  order,
  canStart,
  canComplete,
  canCancel,
}: ProductionOrderActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionType, setActionType] = useState<"start" | "complete" | "cancel" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const result = await startProductionOrder(order.id);
    setLoading(false);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order started successfully",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to start production order",
        variant: "destructive",
      });
    }
    setActionType(null);
  };

  const handleComplete = async () => {
    setLoading(true);
    const result = await completeProductionOrder(order.id);
    setLoading(false);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order completed successfully. Stock has been updated.",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete production order",
        variant: "destructive",
      });
    }
    setActionType(null);
  };

  const handleCancel = async () => {
    setLoading(true);
    const result = await cancelProductionOrder(order.id);
    setLoading(false);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order cancelled successfully",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cancel production order",
        variant: "destructive",
      });
    }
    setActionType(null);
  };

  return (
    <>
      {order.status === "PLANNED" && canStart && (
        <Button onClick={() => setActionType("start")} disabled={loading}>
          <FiPlay className="mr-2 h-4 w-4" />
          Start
        </Button>
      )}
      {order.status === "IN_PROGRESS" && canComplete && (
        <Button onClick={() => setActionType("complete")} disabled={loading}>
          <FiCheck className="mr-2 h-4 w-4" />
          Complete
        </Button>
      )}
      {(order.status === "PLANNED" || order.status === "IN_PROGRESS") && canCancel && (
        <Button
          variant="destructive"
          onClick={() => setActionType("cancel")}
          disabled={loading}
        >
          <FiX className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}

      <AlertDialog open={actionType === "start"} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to start this production order? This will change the status to
              "In Progress".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStart} disabled={loading}>
              Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "complete"} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this production order? This will:
              <ul className="list-disc list-inside mt-2">
                <li>Deduct raw materials from stock</li>
                <li>Add finished goods to stock</li>
                <li>Update stock ledger</li>
                <li>Mark the order as completed</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={loading}>
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "cancel"} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this production order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
