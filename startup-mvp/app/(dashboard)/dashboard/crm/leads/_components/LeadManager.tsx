"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadGrid from "./LeadGrid";
import LeadKanban from "./LeadKanban";
import LeadSheet from "./LeadSheet";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { FiPlus, FiRefreshCcw, FiSearch, FiUser, FiList, FiGrid, FiColumns, FiTrash2 } from "react-icons/fi";
import { EmptyState } from "@/components/crm/EmptyState";
import LeadTable from "./LeadTable";
import { getLeads, updateLeadStatus } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { LeadStatus } from "@prisma/client";

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

type ViewMode = "table" | "grid" | "kanban";

export default function LeadManager({ initialLeads, initialPagination, initialOwners, canCreate }: LeadManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "table");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("sortOrder") as "asc" | "desc") || "desc");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">((searchParams.get("status") as LeadStatus) || "all");
  const [dateFrom, setDateFrom] = useState<string | undefined>(searchParams.get("dateFrom") || undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(searchParams.get("dateTo") || undefined);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 500);

  // Trash View State
  const [isTrashView, setIsTrashView] = useState(false);

  // Reset trash view if filters change significantly, or easier: reset other filters when entering trash?
  // Let's keep it simple.

  const fetchLeads = (page: number = 1) => {
    startTransition(async () => {
      console.log("fetchLeads calling getLeads with:", { page, search: debouncedSearch, status: statusFilter, sortBy, sortOrder, dateFrom, dateTo, isTrashView });
      const result = await getLeads(
        page, 
        view === "kanban" ? 100 : 10, 
        debouncedSearch, 
        statusFilter, 
        sortBy, 
        sortOrder,
        dateFrom,
        dateTo,
        isTrashView // Pass trash status
      );
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
    const params = new URLSearchParams();
    
    // Always include current filters in URL
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (view !== "table") params.set("view", view);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    // Maybe track trash view in URL? 
    // For now keeping it local state to avoid complex URL permutations unless requested.
    
    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    // Only update URL if it's different from current
    if (queryString !== currentQueryString) {
      console.log("LeadManager filters changed, updating URL with:", queryString);
      router.push(`/dashboard/crm/leads?${queryString}`, { scroll: false });
    }
    
    // Fetch leads whenever dependencies change, including isTrashView
    fetchLeads(1);
  }, [debouncedSearch, view, sortBy, sortOrder, statusFilter, dateFrom, dateTo, isTrashView]);

  const handleCreateSuccess = () => {
    setIsDrawerOpen(false);
    setEditingLead(null);
    fetchLeads(pagination.page);
    toast.success("Lead created successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads {isTrashView && <span className="text-destructive">(Trash)</span>}</h2>
          <p className="text-muted-foreground">
            {isTrashView ? "Manage deleted leads. Restore or permanently delete them." : "Manage your incoming leads and track initial revenue discovery."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            {!isTrashView ? (
                <>
                    <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-auto">
                        <TabsList>
                        <TabsTrigger value="table" title="Table View"><FiList className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="grid" title="Grid View"><FiGrid className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="kanban" title="Kanban View"><FiColumns className="h-4 w-4" /></TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <Button variant="outline" size="sm" onClick={() => setIsTrashView(true)} className="text-destructive border-destructive/20 hover:bg-destructive/10">
                        <FiTrash2 className="mr-2 h-4 w-4" /> Trash
                    </Button>
                </>
            ) : (
                <Button variant="outline" size="sm" onClick={() => setIsTrashView(false)}>
                    <FiList className="mr-2 h-4 w-4" /> Back to Leads
                </Button>
            )}
          
          <Button variant="outline" size="icon" onClick={() => fetchLeads(pagination.page)} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          {!isTrashView && canCreate && (
            <Button onClick={() => { setEditingLead(null); setIsDrawerOpen(true); }} className="gap-2">
                <FiPlus /> New Lead
            </Button>
          )}
        </div>
      </div>

      <div className="bg-muted/20 p-4 rounded-lg border border-dashed space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search leads..."
                className="pl-8 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-muted-foreground">Filter by Status:</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="w-[140px] bg-background">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value={LeadStatus.NEW}>New</SelectItem>
                        <SelectItem value={LeadStatus.CONTACTED}>Contacted</SelectItem>
                        <SelectItem value={LeadStatus.QUALIFIED}>Qualified</SelectItem>
                        <SelectItem value={LeadStatus.UNQUALIFIED}>Unqualified</SelectItem>
                        <SelectItem value={LeadStatus.CONVERTED}>Converted</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-dashed border-muted">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        value={dateFrom || ""} 
                        onChange={(e) => setDateFrom(e.target.value || undefined)}
                        className="w-[150px] h-9 bg-background py-1"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input 
                        type="date" 
                        value={dateTo || ""} 
                        onChange={(e) => setDateTo(e.target.value || undefined)}
                        className="w-[150px] h-9 bg-background py-1"
                    />
                    {(dateFrom || dateTo) && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
                            className="h-8 px-2 text-xs"
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {leads.length === 0 && !search ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
                <EmptyState 
                    icon={isTrashView ? FiTrash2 : FiUser} 
                    title={isTrashView ? "Trash is Empty" : "No Leads Yet"} 
                    description={isTrashView ? "No deleted leads found." : (canCreate ? "Capture your first lead to start tracking potential deals." : "No leads found.")}
                    actionLabel={!isTrashView && canCreate ? "Create Lead" : undefined}
                    onAction={!isTrashView && canCreate ? () => { setEditingLead(null); setIsDrawerOpen(true); } : undefined}
                />
            </div>
      ) : (
        <div className="transition-all duration-300">
          {view === "table" && (
            <LeadTable
              leads={leads}
              owners={initialOwners}
              onEdit={(lead) => { setEditingLead(lead); setIsDrawerOpen(true); }}
              onRefresh={() => fetchLeads(pagination.page)}
              isTrashView={isTrashView}
            />
          )}
          {view === "grid" && !isTrashView && (
            <LeadGrid 
              leads={leads}
              onEdit={(lead) => { setEditingLead(lead); setIsDrawerOpen(true); }}
            />
          )}
          {view === "kanban" && !isTrashView && (
            <LeadKanban 
                initialLeads={leads} 
                canCreate={canCreate} 
                onRefresh={() => fetchLeads(pagination.page)} 
            />
          )}
          {isTrashView && view !== "table" && (
             <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                 Grid and Kanban views are not available in Trash. Please switch to Table view.
             </div>
          )}
        </div>
      )}

      {/* Basic Pagination Controls - Hidden in Kanban */}
      {(view !== "kanban" || isTrashView) && (
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
      )}

      <LeadSheet
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        lead={editingLead}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
