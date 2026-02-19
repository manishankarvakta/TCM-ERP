
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ActivityForm from "./ActivityForm";

interface ActivitySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activity: any | null;
  onSuccess: () => void;
  contacts?: any[];
  leads?: any[];
  opportunities?: any[];
  users?: any[];
}

export default function ActivitySheet({
  isOpen,
  onOpenChange,
  activity,
  onSuccess,
  contacts = [],
  leads = [],
  opportunities = [],
  users = [],
}: ActivitySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {activity ? "Edit Activity" : "Log Activity"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ActivityForm
            initialData={activity}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            contacts={contacts}
            leads={leads}
            opportunities={opportunities}
            users={users}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
