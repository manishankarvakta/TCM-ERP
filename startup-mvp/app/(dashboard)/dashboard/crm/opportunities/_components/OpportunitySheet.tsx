"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import OpportunityForm from "./OpportunityForm";

interface OpportunitySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: any[];
  editingOpp?: any; // The opportunity to edit, if any
}

export default function OpportunitySheet({
  isOpen,
  onOpenChange,
  onSuccess,
  clients,
  editingOpp
}: OpportunitySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader className="mb-6">
          <SheetTitle>{editingOpp ? "Edit Opportunity" : "Create Opportunity"}</SheetTitle>
          <SheetDescription>
            {editingOpp 
              ? "Update the details of this opportunity." 
              : "Fill in the details to create a new opportunity in your pipeline."}
          </SheetDescription>
        </SheetHeader>
        
        <OpportunityForm 
          clients={clients} 
          onSuccess={onSuccess} 
          onCancel={() => onOpenChange(false)}
          initialData={editingOpp}
        />
      </SheetContent>
    </Sheet>
  );
}
