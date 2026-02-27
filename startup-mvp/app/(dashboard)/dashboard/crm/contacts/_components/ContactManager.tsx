"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiSearch, FiFilter, FiPlus } from "react-icons/fi";
import { useDebounce } from "@/hooks/use-debounce";
import ContactTable from "./ContactTable";
import ContactSheet from "./ContactSheet";

interface ContactManagerProps {
  initialContacts: any[];
  clients: any[];
  defaultClientId?: string;
  defaultSearch?: string;
  hideClientColumn?: boolean;
  canCreate: boolean;
}

export default function ContactManager({ 
  initialContacts, 
  clients, 
  defaultClientId,
  defaultSearch,
  hideClientColumn,
  canCreate
}: ContactManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [search, setSearch] = useState(defaultSearch || "");
  const [clientId, setClientId] = useState(defaultClientId || "all");
  const [clientSearch, setClientSearch] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const lowerSearch = clientSearch.toLowerCase();
    return clients.filter(c => 
      (c.company || "").toLowerCase().includes(lowerSearch) || 
      (c.name || "").toLowerCase().includes(lowerSearch)
    );
  }, [clients, clientSearch]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (debouncedSearch !== (params.get("search") || "")) {
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      changed = true;
    }

    if (clientId !== (params.get("clientId") || "all")) {
      if (clientId && clientId !== "all") {
        params.set("clientId", clientId);
      } else {
        params.delete("clientId");
      }
      changed = true;
    }

    if (changed) {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, clientId, pathname, router, searchParams]);

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

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search contacts..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {!hideClientColumn && (
            <div className="flex items-center gap-2 w-full md:w-72">
              <FiFilter className="text-muted-foreground shrink-0" />
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by Client" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                    <div className="relative">
                      <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                      <Input
                        placeholder="Search clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="h-8 text-xs pl-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <SelectItem value="all">
                    <span className="font-medium">All Clients</span>
                  </SelectItem>
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No clients found
                    </div>
                  ) : (
                    filteredClients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-sm">
                            {client.company || client.name}
                          </span>
                          {client.company && client.name && (
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {client.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {(search || (clientId !== "all" && !defaultClientId)) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearch("");
                setClientId("all");
              }}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
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

