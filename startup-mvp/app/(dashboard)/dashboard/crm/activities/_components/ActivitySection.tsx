"use client";

import { useState } from "react";
import ActivityTimeline from "./ActivityTimeline";
import ActivityForm from "./ActivityForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  // Prepare initial data for the form to pre-select the current entity
  const initialData = {
    [entityType + "Id"]: entityId
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Activities</h3>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <FiPlus className="mr-2 h-4 w-4" /> Log Activity
        </Button>
      </div>

      <ActivityTimeline activities={activities} />

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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
