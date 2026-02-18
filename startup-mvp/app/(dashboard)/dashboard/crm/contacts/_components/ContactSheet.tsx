"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ContactForm from "./ContactForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any | null; // Pass null for creating new contact
  onSuccess: () => void;
  clients: { id: string; name: string }[];
}

export default function ContactSheet({
  open,
  onOpenChange,
  contact,
  onSuccess,
  clients,
}: ContactSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle>{contact ? "Edit Contact" : "Create New Contact"}</SheetTitle>
              <SheetDescription>
                {contact
                  ? "Update the details of this contact."
                  : "Fill in the details below to add a new contact."}
              </SheetDescription>
            </div>
            {contact && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/crm/contacts/${contact.id}`}>
                  <FiExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Link>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="mt-6">
          <ContactForm
            clients={clients}
            initialData={contact}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
