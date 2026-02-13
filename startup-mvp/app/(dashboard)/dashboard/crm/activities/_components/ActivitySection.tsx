"use client";

import { useState, useEffect } from "react";
import ActivityTimeline from "./ActivityTimeline";
import ActivityForm from "./ActivityForm";
import ActivitySheet from "./ActivitySheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { getActiveUsers } from "@/app/actions/user.action";

interface ActivitySectionProps {
  entityId: string;
  entityType: "contact" | "opportunity" | "lead";
  activities: any[];
  // Optional: Pass context data if needed for the form to allow linking other items
  contextData?: {
    contacts?: any[];
    opportunities?: any[];
    leads?: any[];
  };
}

export default function ActivitySection({ 
    entityId, 
    entityType, 
    activities,
    contextData 
}: ActivitySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
        const result = await getActiveUsers();
        if (result.success) {
            setUsers(result.users);
        }
    };
    fetchUsers();
  }, []);

  const handleSuccess = () => {
    setIsOpen(false);
    setSelectedActivity(null);
    router.refresh();
  };

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
  };

  // Prepare initial data for the form to pre-select the current entity
  const initialData = {
    [entityType + "Id"]: entityId
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-4">
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} className="rounded-full px-4 border-border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm bg-background">
          <FiPlus className="mr-2 h-4 w-4" /> Log Activity
        </Button>
      </div>

      <ActivityTimeline 
        activities={activities} 
        onActivityClick={handleActivityClick}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onSuccess={handleSuccess}
            onCancel={() => setIsOpen(false)}
            initialData={initialData}
            contacts={contextData?.contacts}
            opportunities={contextData?.opportunities}
            leads={contextData?.leads}
            users={users}
          />
        </DialogContent>
      </Dialog>

      <ActivitySheet
        isOpen={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
        activity={selectedActivity}
        onSuccess={handleSuccess}
        contacts={contextData?.contacts}
        opportunities={contextData?.opportunities}
        leads={contextData?.leads}
        users={users}
      />
    </div>
  );
}
