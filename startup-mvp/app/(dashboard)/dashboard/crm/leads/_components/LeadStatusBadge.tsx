"use client";

import { useState, useTransition } from "react";
import { LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateLeadStatus } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LeadStatusBadgeProps {
  leadId: string;
  currentStatus: LeadStatus;
}

const statusColors: Record<LeadStatus, "default" | "secondary" | "outline" | "destructive" | "success"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  UNQUALIFIED: "destructive",
  CONVERTED: "outline",
};

export function LeadStatusBadge({ leadId, currentStatus }: LeadStatusBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      try {
        const result = await updateLeadStatus(leadId, newStatus);
        if (result.success) {
          toast.success(`Status updated to ${newStatus}`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update status");
        }
      } catch (error) {
        toast.error("An error occurred while updating status");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none disabled:opacity-50" disabled={isPending || currentStatus === "CONVERTED"}>
          <Badge 
            variant={statusColors[currentStatus] || "default"}
            className={cn(
              "cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[10px] h-5 px-2",
              isPending && "animate-pulse"
            )}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            {currentStatus}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Object.keys(statusColors).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status as LeadStatus)}
            className={cn(
              "capitalize",
              currentStatus === status && "bg-accent font-semibold"
            )}
            disabled={status === "CONVERTED"} // Conversion should be done via the button
          >
            {status.toLowerCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
