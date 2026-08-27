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
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [note, setNote] = useState("");
  const [closingReason, setClosingReason] = useState("");

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === currentStatus) return;
    setSelectedStatus(newStatus);
    setNote("");
    setClosingReason("");
    setStatusUpdateOpen(true);
  };

  const handleSubmitStatusChange = () => {
    if (!selectedStatus) return;
    if (!note.trim()) {
      toast.error("Note is required");
      return;
    }
    if (selectedStatus === "UNQUALIFIED" && !closingReason.trim()) {
      toast.error("Closing reason is required");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateLeadStatus(leadId, selectedStatus, note, closingReason || undefined);
        if (result.success) {
          toast.success(`Status updated to ${statusLabels[selectedStatus] || selectedStatus}`);
          setStatusUpdateOpen(false);
          setNote("");
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

      <Dialog open={statusUpdateOpen} onOpenChange={(open) => !open && setStatusUpdateOpen(false)}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Update Lead Status</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="text-sm font-medium">
                      Changing status to: <Badge variant={selectedStatus ? (statusColors[selectedStatus] || "default") : "default"}>{selectedStatus ? (statusLabels[selectedStatus] || selectedStatus) : ""}</Badge>
                  </div>
                  {selectedStatus === "UNQUALIFIED" && (
                      <div className="grid gap-2">
                          <Label htmlFor="badgeClosingReason">Why is this lead unqualified? *</Label>
                          <Textarea 
                              id="badgeClosingReason" 
                              value={closingReason} 
                              onChange={(e) => setClosingReason(e.target.value)}
                              placeholder="e.g. Budget constraint, lost to competitor, no response..."
                          />
                      </div>
                  )}
                  <div className="grid gap-2">
                      <Label htmlFor="badgeStatusNote">Note / Comment *</Label>
                      <Textarea 
                          id="badgeStatusNote" 
                          value={note} 
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Provide a mandatory note for this status change..."
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setStatusUpdateOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmitStatusChange} disabled={isPending}>Submit</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
