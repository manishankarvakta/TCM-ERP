"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { FiPlus, FiRefreshCcw } from "react-icons/fi";
import OpportunityTable from "./OpportunityTable";
import { getOpportunities } from "@/app/actions/crm/opportunity.action";
import { toast } from "sonner";

export default function OpportunityManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const fetchOpportunities = () => {
    startTransition(async () => {
      const result = await getOpportunities();
      if (result.success) {
        setOpportunities(result.opportunities || []);
      } else {
        toast.error(result.error || "Failed to load opportunities");
      }
    });
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Opportunities</h2>
          <p className="text-muted-foreground">
            Track your sales pipeline and manage revenue deals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchOpportunities} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingOpp(null); setIsDialogOpen(true); }} className="gap-2">
            <FiPlus /> New Opportunity
          </Button>
        </div>
      </div>

      <OpportunityTable 
        opportunities={opportunities} 
        onEdit={(opp) => { setEditingOpp(opp); setIsDialogOpen(true); }} 
        onRefresh={fetchOpportunities}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOpp ? "Edit Opportunity" : "Create Opportunity"}</DialogTitle>
            <DialogDescription>
              Manage deal stages and estimated revenue. 
              {/* Form implementation coming soon */}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground italic">
            Opportunity Form Implementation - Coming Soon.
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
