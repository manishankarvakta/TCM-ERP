"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { OpportunityStage } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { FiPlus, FiRefreshCcw, FiSearch, FiTrendingUp, FiList, FiGrid, FiColumns } from "react-icons/fi";
import { EmptyState } from "@/components/crm/EmptyState";
import { toast } from "sonner";
import OpportunityTable from "./OpportunityTable";
import OpportunityGrid from "./OpportunityGrid";
import { OpportunityKanban } from "@/components/crm/kanban/OpportunityKanban";
import { getOpportunities } from "@/app/actions/crm/opportunity.action";
import { getClients } from "@/app/(dashboard)/dashboard/crm/clients/_actions/client.action";
import { getActiveUsers } from "@/app/actions/user.action";
import OpportunitySheet from "./OpportunitySheet";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = "table" | "grid" | "kanban";

export default function OpportunityManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const [pagination, setPagination] = useState<Pagination>({ page: page, limit: 10, total: 0, totalPages: 0 });
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "table");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("sortOrder") as "asc" | "desc") || "desc");
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">((searchParams.get("stage") as OpportunityStage) || "all");
  const [dateFrom, setDateFrom] = useState<string | undefined>(searchParams.get("dateFrom") || undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(searchParams.get("dateTo") || undefined);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 500);

  const fetchOpportunities = (pageToFetch: number = page) => {
    startTransition(async () => {
      const result = await getOpportunities(
        pageToFetch, 
        view === "kanban" ? 100 : 10, 
        debouncedSearch, 
        stageFilter, 
        sortBy, 
        sortOrder,
        dateFrom,
        dateTo
      );
      if (result.success) {
        setOpportunities(result.opportunities || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        toast.error(result.error || "Failed to load opportunities");
      }
    });
  };

  useEffect(() => {
    async function fetchClientsAndUsers() {
      const [clientResult, userResult] = await Promise.all([
         getClients(1, 100),
         getActiveUsers()
      ]);

      if (clientResult.success) {
        setClients(clientResult.clients || []);
      }
      
      if (userResult.success) {
        setUsers(userResult.users || []);
      }
    }
    fetchClientsAndUsers();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    let filtersChanged = false;

    if (debouncedSearch && params.get("search") !== debouncedSearch) { params.set("search", debouncedSearch); filtersChanged = true; }
    else if (!debouncedSearch && params.has("search")) { params.delete("search"); filtersChanged = true; }

    if (view !== "table" && params.get("view") !== view) { params.set("view", view); filtersChanged = true; }
    else if (view === "table" && params.has("view")) { params.delete("view"); filtersChanged = true; }

    if (sortBy !== "updatedAt" && params.get("sortBy") !== sortBy) { params.set("sortBy", sortBy); filtersChanged = true; }
    else if (sortBy === "updatedAt" && params.has("sortBy")) { params.delete("sortBy"); filtersChanged = true; }

    if (sortOrder !== "desc" && params.get("sortOrder") !== sortOrder) { params.set("sortOrder", sortOrder); filtersChanged = true; }
    else if (sortOrder === "desc" && params.has("sortOrder")) { params.delete("sortOrder"); filtersChanged = true; }

    if (stageFilter !== "all" && params.get("stage") !== stageFilter) { params.set("stage", stageFilter); filtersChanged = true; }
    else if (stageFilter === "all" && params.has("stage")) { params.delete("stage"); filtersChanged = true; }

    if (dateFrom && params.get("dateFrom") !== dateFrom) { params.set("dateFrom", dateFrom); filtersChanged = true; }
    else if (!dateFrom && params.has("dateFrom")) { params.delete("dateFrom"); filtersChanged = true; }

    if (dateTo && params.get("dateTo") !== dateTo) { params.set("dateTo", dateTo); filtersChanged = true; }
    else if (!dateTo && params.has("dateTo")) { params.delete("dateTo"); filtersChanged = true; }

    // If filters changed, reset page to 1
    if (filtersChanged) {
      params.delete("page");
      router.push(`/dashboard/crm/opportunities?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, view, sortBy, sortOrder, stageFilter, dateFrom, dateTo, router, searchParams]);

  // Main fetch effect, triggers when URL page changes
  useEffect(() => {
    fetchOpportunities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, view, sortBy, sortOrder, stageFilter, dateFrom, dateTo]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) params.set("page", newPage.toString());
    else params.delete("page");
    router.push(`/dashboard/crm/opportunities?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Opportunities</h2>
          <p className="text-muted-foreground">
            Track your sales pipeline and manage revenue deals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-auto">
            <TabsList>
              <TabsTrigger value="table" title="Table View"><FiList className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grid" title="Grid View"><FiGrid className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="kanban" title="Kanban View"><FiColumns className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" size="icon" onClick={() => fetchOpportunities(page)} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingOpp(null); setIsDialogOpen(true); }} className="gap-2">
            <FiPlus /> New Opportunity
          </Button>
        </div>
      </div>

      <div className="bg-muted/20 p-4 rounded-lg border border-dashed space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search opportunities..."
              className="pl-8 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-muted-foreground">Stage:</span>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.values(OpportunityStage).map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-dashed border-muted">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Date:</span>
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
            <span className="text-sm font-medium text-muted-foreground">Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Updated At</SelectItem>
                <SelectItem value="createdAt">Created At</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {opportunities.length === 0 && !search ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
          <EmptyState 
            icon={FiTrendingUp} 
            title="No Opportunities Yet" 
            description="Start tracking your sales pipeline."
            actionLabel="Create Opportunity"
            onAction={() => setIsDialogOpen(true)}
          />
        </div>
      ) : (
        <div className="transition-all duration-300">
          {view === "table" && (
            <OpportunityTable
              opportunities={opportunities}
              onEdit={(opp) => { setEditingOpp(opp); setIsDialogOpen(true); }}
              onRefresh={() => fetchOpportunities(page)}
            />
          )}
          {view === "grid" && (
            <OpportunityGrid 
              opportunities={opportunities}
              onEdit={(opp) => { setEditingOpp(opp); setIsDialogOpen(true); }}
            />
          )}
          {view === "kanban" && (
            <OpportunityKanban 
              initialOpportunities={opportunities} 
              clients={clients}
              canCreate={true}
            />
          )}
        </div>
      )}

      {view !== "kanban" && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
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
            onClick={() => handlePageChange(page + 1)}
            disabled={pagination.page >= pagination.totalPages || isPending}
          >
            Next
          </Button>
        </div>
      )}

      <OpportunitySheet 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSuccess={() => { setIsDialogOpen(false); fetchOpportunities(page); }}
        clients={clients}
        users={users}
        editingOpp={editingOpp}
      />
    </div>
  );
}
