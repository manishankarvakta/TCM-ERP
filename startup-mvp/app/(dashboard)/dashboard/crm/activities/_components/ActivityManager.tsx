"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiRefreshCcw } from "react-icons/fi";
import { getActivities, completeActivity } from "@/app/actions/crm/activity.action";
import { getContacts } from "@/app/actions/crm/contact.action";
import { getLeads } from "@/app/actions/crm/lead.action";
import { getOpportunities } from "@/app/actions/crm/opportunity.action";
import { toast } from "sonner";
import ActivityList from "./ActivityList";
import ActivityForm from "./ActivityForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ActivityManager() {
  const [activities, setActivities] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Add editing state if we want to allow editing from the list (future enhancement or if list has edit button)
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const fetchData = () => {
    startTransition(async () => {
      // Parallel fetch for speed
      const [activityRes, contactRes, leadRes, oppRes] = await Promise.all([
        getActivities(1, 100),
        getContacts(), // Need to check if this supports pagination or returns all? Default is usually paginated or limited.
        getLeads(1, 100),
        getOpportunities(1, 100)
      ]);

      if (activityRes.success) setActivities(activityRes.activities || []);
      else toast.error(activityRes.error || "Failed to load activities");

      if (contactRes.success) setContacts(contactRes.contacts || []);
      if (leadRes.success) setLeads(leadRes.leads || []);
      if (oppRes.success) setOpportunities(oppRes.opportunities || []);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = (id: string) => {
    startTransition(async () => {
        const result = await completeActivity(id);
        if (result.success) {
            toast.success("Activity marked as completed");
            fetchData(); // Refresh list to update status
        } else {
            toast.error(result.error || "Failed to update activity");
        }
    });
  }

  const handleSuccess = () => {
      setIsDrawerOpen(false);
      setEditingActivity(null);
      fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activities</h2>
          <p className="text-muted-foreground">
            Track all interactions, tasks, emails, and calls across your CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingActivity(null); setIsDrawerOpen(true); }} className="gap-2">
            <FiPlus /> Log Activity
          </Button>
        </div>
      </div>

      <ActivityList 
        activities={activities} 
        onComplete={handleComplete}
      />

       <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Edit Activity" : "Log Activity"}</DialogTitle>
            <DialogDescription>
              {editingActivity ? "Update activity details." : "Record a new interaction."}
            </DialogDescription>
          </DialogHeader>
          <ActivityForm 
            onSuccess={handleSuccess}
            onCancel={() => setIsDrawerOpen(false)}
            initialData={editingActivity}
            contacts={contacts}
            leads={leads}
            opportunities={opportunities}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
