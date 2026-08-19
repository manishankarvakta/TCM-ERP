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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  CONVERTED: "Opportunities",
};

export function LeadStatusBadge({ leadId, currentStatus }: LeadStatusBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [unqualifiedOpen, setUnqualifiedOpen] = useState(false);
  const [closingReason, setClosingReason] = useState("");

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === currentStatus) return;

    if (newStatus === "UNQUALIFIED") {
      setUnqualifiedOpen(true);
      setClosingReason("");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateLeadStatus(leadId, newStatus);
        if (result.success) {
          toast.success(`Status updated to ${statusLabels[newStatus] || newStatus}`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update status");
        }
      } catch (error) {
        toast.error("An error occurred while updating status");
      }
    });
  };

  const handleUnqualifiedSubmit = () => {
    if (!closingReason.trim()) {
      toast.error("Closing reason is required");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateLeadStatus(leadId, "UNQUALIFIED", closingReason);
        if (result.success) {
          toast.success("Lead marked as Unqualified");
          setUnqualifiedOpen(false);
          setClosingReason("");
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
    <>
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
              {statusLabels[currentStatus] || currentStatus}
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
              {statusLabels[status as LeadStatus] || status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={unqualifiedOpen} onOpenChange={(open) => !open && setUnqualifiedOpen(false)}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Lead Closing Reason</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="badgeClosingReason">Why is this lead unqualified? *</Label>
                      <Textarea 
                          id="badgeClosingReason" 
                          value={closingReason} 
                          onChange={(e) => setClosingReason(e.target.value)}
                          placeholder="e.g. Budget constraint, lost to competitor, no response..."
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setUnqualifiedOpen(false)}>Cancel</Button>
                  <Button onClick={handleUnqualifiedSubmit} disabled={isPending}>Submit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
