"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FiPlus, FiUsers } from "react-icons/fi";
import ContactTable from "./ContactTable";
import ContactForm from "./ContactForm";
import { useRouter } from "next/navigation";

interface ContactManagerProps {
  initialContacts: any[];
  clients: any[];
  defaultClientId?: string;
  hideClientColumn?: boolean;
  canCreate: boolean;
}

export default function ContactManager({ 
  initialContacts, 
  clients, 
  defaultClientId,
  hideClientColumn,
  canCreate
}: ContactManagerProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingContact(defaultClientId ? { clientId: defaultClientId } : null);
    setIsSheetOpen(true);
  };

  const handleSuccess = () => {
    setIsSheetOpen(false);
    setEditingContact(null);
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
          <p className="text-muted-foreground">
            Manage your customer contacts and stakeholders.
          </p>
        </div>
        {canCreate && (
            <Button onClick={handleCreate} className="gap-2">
            <FiPlus /> New Contact
            </Button>
        )}
      </div>

      <ContactTable
        contacts={initialContacts}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
        hideClientColumn={hideClientColumn}
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingContact ? "Edit Contact" : "Create New Contact"}</SheetTitle>
            <SheetDescription>
              {editingContact ? "Update contact details." : "Add a new contact person to your CRM."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ContactForm
              clients={clients}
              initialData={editingContact}
              onSuccess={handleSuccess}
              onCancel={() => setIsSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
