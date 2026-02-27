import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";

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
  users?: any[];
}

export default function OpportunitySheet({
  isOpen,
  onOpenChange,
  onSuccess,
  clients,
  editingOpp,
  users = []
}: OpportunitySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto" side="right">
        <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <SheetTitle>{editingOpp ? "Edit Opportunity" : "Create Opportunity"}</SheetTitle>
                  <SheetDescription>
                    {editingOpp 
                      ? "Update the details of this opportunity." 
                      : "Fill in the details to create a new opportunity in your pipeline."}
                  </SheetDescription>
                </div>
                {editingOpp && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/crm/opportunities/${editingOpp.id}`}>
                      <FiExternalLink className="mr-2 h-4 w-4" />
                      View Full Details
                    </Link>
                  </Button>
                )}
            </div>
        </SheetHeader>
        
        <OpportunityForm 
          clients={clients} 
          onSuccess={onSuccess} 
          onCancel={() => onOpenChange(false)}
          initialData={editingOpp}
          users={users}
        />
      </SheetContent>
    </Sheet>
  );
}
