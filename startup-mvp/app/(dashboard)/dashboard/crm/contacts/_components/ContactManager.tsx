"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import ContactTable from "./ContactTable";
import ContactSheet from "./ContactSheet";
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

      <ContactSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        contact={editingContact}
        onSuccess={handleSuccess}
        clients={clients}
      />
    </div>
  );
}

