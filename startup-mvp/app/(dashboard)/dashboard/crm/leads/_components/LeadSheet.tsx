import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import LeadForm from "./LeadForm";

interface LeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any | null; // Pass null for creating new lead
  onSuccess: () => void;
  categories: { id: string; name: string }[];
}

export default function LeadSheet({
  open,
  onOpenChange,
  lead,
  onSuccess,
  categories,
}: LeadSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle>{lead ? "Edit Lead" : "Create New Lead"}</SheetTitle>
              <SheetDescription>
                {lead
                  ? "Update the details of this lead."
                  : "Fill in the details below to track a new potential business lead."}
              </SheetDescription>
            </div>
            {lead && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/crm/leads/${lead.id}`}>
                  <FiExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Link>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="mt-6">
          <LeadForm
            initialData={lead}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
            categories={categories}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
