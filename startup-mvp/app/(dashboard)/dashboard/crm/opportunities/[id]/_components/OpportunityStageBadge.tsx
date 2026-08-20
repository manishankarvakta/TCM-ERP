"use client";

import { useState, useTransition } from "react";
import { OpportunityStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateOpportunityStage } from "@/app/actions/crm/opportunity.action";
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

interface OpportunityStageBadgeProps {
  opportunityId: string;
  currentStage: OpportunityStage;
}

const stageColors: Record<OpportunityStage, "default" | "secondary" | "outline" | "destructive" | "success"> = {
  DISCOVERY: "default",
  QUALIFIED: "secondary",
  SOLUTION: "outline",
  PROPOSAL: "secondary",
  NEGOTIATION: "outline",
  WON: "success",
  LOST: "destructive",
  UNQUALIFIED: "destructive",
};

const stageLabels: Record<OpportunityStage, string> = {
  DISCOVERY: "Discovery",
  QUALIFIED: "Qualified",
  SOLUTION: "Solution",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  UNQUALIFIED: "Unqualified",
};

export function OpportunityStageBadge({ opportunityId, currentStage }: OpportunityStageBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [unqualifiedOpen, setUnqualifiedOpen] = useState(false);
  const [closingReason, setClosingReason] = useState("");

  const handleStageChange = (newStage: OpportunityStage) => {
    if (newStage === currentStage) return;

    if (newStage === "UNQUALIFIED") {
      setUnqualifiedOpen(true);
      setClosingReason("");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateOpportunityStage(opportunityId, newStage);
        if (result.success) {
          toast.success(`Stage updated to ${stageLabels[newStage] || newStage}`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update stage");
        }
      } catch (error) {
        toast.error("An error occurred while updating stage");
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
        const result = await updateOpportunityStage(opportunityId, "UNQUALIFIED", closingReason);
        if (result.success) {
          toast.success("Opportunity marked as Unqualified");
          setUnqualifiedOpen(false);
          setClosingReason("");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update stage");
        }
      } catch (error) {
        toast.error("An error occurred while updating stage");
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none disabled:opacity-50" disabled={isPending}>
            <Badge 
              variant={stageColors[currentStage] || "default"}
              className={cn(
                "cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[10px] h-6 px-3 flex items-center gap-1.5",
                isPending && "animate-pulse"
              )}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              {stageLabels[currentStage] || currentStage}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.keys(stageColors).map((stage) => (
            <DropdownMenuItem
              key={stage}
              onClick={() => handleStageChange(stage as OpportunityStage)}
              className={cn(
                "capitalize",
                currentStage === stage && "bg-accent font-semibold"
              )}
            >
              {stageLabels[stage as OpportunityStage] || stage}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={unqualifiedOpen} onOpenChange={(open) => !open && setUnqualifiedOpen(false)}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Opportunity Closing Reason</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="badgeClosingReason">Why is this opportunity unqualified? *</Label>
                      <Textarea 
                          id="badgeClosingReason" 
                          value={closingReason} 
                          onChange={(e) => setClosingReason(e.target.value)}
                          placeholder="e.g. Budget constraint, lost to competitor..."
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
