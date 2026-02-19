"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ClientForm from "./clientForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any | null; // Pass null for creating new client
  onSuccess: () => void;
}

export default function ClientSheet({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientSheetProps) {
  // Determine if we are editing or creating
  const mode = client ? "edit" : "create";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle>{client ? "Edit Client" : "Create New Client"}</SheetTitle>
              <SheetDescription>
                {client
                  ? "Update the details of this client."
                  : "Fill in the details below to add a new client."}
              </SheetDescription>
            </div>
            {client && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/crm/clients/${client.id}`}>
                  <FiExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Link>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="mt-6">
          <ClientForm
            mode={mode}
            initialData={client}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
