"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { FiPlus, FiRefreshCcw, FiSearch, FiUser } from "react-icons/fi";
import { EmptyState } from "@/components/crm/EmptyState";
import LeadTable from "./LeadTable";
import LeadForm from "./LeadForm";
import { getLeads } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeadManagerProps {
  initialLeads: any[];
  initialPagination: Pagination;
  initialOwners: any[];
  canCreate: boolean;
}

export default function LeadManager({ initialLeads, initialPagination, initialOwners, canCreate }: LeadManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 500);

  const fetchLeads = (page: number = 1) => {
    startTransition(async () => {
      const result = await getLeads(page, 100, debouncedSearch);
      if (result.success) {
        setLeads(result.leads || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        toast.error(result.error || "Failed to load leads");
      }
    });
  };

  useEffect(() => {
    // Only fetch if search changes and it's not the initial render (unless search was in URL)
    if (debouncedSearch !== (searchParams.get("search") || "")) {
       const params = new URLSearchParams(searchParams.toString());
       if (debouncedSearch) {
         params.set("search", debouncedSearch);
       } else {
         params.delete("search");
       }
       params.set("page", "1");
       router.push(`/dashboard/crm/leads?${params.toString()}`);
       // The page reload/server action will handle the fetch, but for smoother UX we can also fetch client-side
       // However, to avoid race conditions with standard navigation, we might just rely on the router push if we are fully SSR.
       // But this is a hybrid. Let's fetch to update local state immediately.
       fetchLeads(1);
    }
  }, [debouncedSearch]);

  const handleCreateSuccess = () => {
    setIsDrawerOpen(false);
    setEditingLead(null);
    fetchLeads(pagination.page);
    toast.success("Lead created successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Manage your incoming leads and track initial revenue discovery.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search leads..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchLeads(pagination.page)} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          {canCreate && (
            <Button onClick={() => { setEditingLead(null); setIsDrawerOpen(true); }} className="gap-2">
                <FiPlus /> New Lead
            </Button>
          )}
        </div>
      </div>

      {leads.length === 0 && !search ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
                <EmptyState 
                    icon={FiUser} 
                    title="No Leads Yet" 
                    description={canCreate ? "Capture your first lead to start tracking potential deals." : "No leads found."}
                    actionLabel={canCreate ? "Create Lead" : undefined}
                    onAction={canCreate ? () => { setEditingLead(null); setIsDrawerOpen(true); } : undefined}
                />
            </div>
      ) : (
      <LeadTable
        leads={leads}
        owners={initialOwners}
        onEdit={(lead) => { setEditingLead(lead); setIsDrawerOpen(true); }}
        onRefresh={() => fetchLeads(pagination.page)}
      />
      )}

      {/* Basic Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLeads(pagination.page - 1)}
          disabled={pagination.page <= 1 || isPending}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLeads(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || isPending}
        >
          Next
        </Button>
      </div>

      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
            <DialogDescription>
              Fill in the details below to track a new potential business lead.
            </DialogDescription>
          </DialogHeader>
          <LeadForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsDrawerOpen(false)}
            initialData={editingLead}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
