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
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { FiPlus, FiRefreshCcw, FiSearch, FiBriefcase, FiList, FiGrid, FiColumns } from "react-icons/fi";
import { EmptyState } from "@/components/crm/EmptyState";
import ProjectTable from "./ProjectTable";
import ProjectGrid from "./ProjectGrid";
import ProjectKanban from "./ProjectKanban";
import { getProjects } from "@/app/actions/projects/project.action";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import ProjectForm from "@/components/projects/ProjectForm";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProjectManagerAllProps {
  initialProjects: any[];
  initialPagination: Pagination;
  canCreate: boolean;
}

type ViewMode = "table" | "grid" | "kanban";

export default function ProjectManagerAll({ initialProjects, initialPagination, canCreate }: ProjectManagerAllProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<ViewMode>((searchParams.get("view") as ViewMode) || "table");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("sortOrder") as "asc" | "desc") || "desc");
  const [statusFilter, setStatusFilter] = useState<string>((searchParams.get("status") as string) || "all");
  const [priorityFilter, setPriorityFilter] = useState<string>((searchParams.get("priority") as string) || "all");
  const [dateFrom, setDateFrom] = useState<string | undefined>(searchParams.get("dateFrom") || undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(searchParams.get("dateTo") || undefined);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 500);

  const fetchProjectsData = (page: number = 1) => {
    startTransition(async () => {
      const result = await getProjects(
        page, 
        view === "kanban" ? 100 : 10, 
        debouncedSearch, 
        statusFilter, 
        sortBy, 
        sortOrder,
        dateFrom,
        dateTo,
        priorityFilter
      );
      if (result.success) {
        setProjects(result.projects || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        toast.error(result.error || "Failed to load projects");
      }
    });
  };

  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (view !== "table") params.set("view", view);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    
    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (queryString !== currentQueryString) {
      router.push(`/dashboard/projects/all?${queryString}`, { scroll: false });
    }
    
    fetchProjectsData(1);
  }, [debouncedSearch, view, sortBy, sortOrder, statusFilter, priorityFilter, dateFrom, dateTo]);

  const handleCreateSuccess = () => {
    setIsSheetOpen(false);
    setEditingProject(null);
    fetchProjectsData(pagination.page);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           {/* Space reserved if needed for title inside component since title is on page */}
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-auto">
                <TabsList>
                <TabsTrigger value="table" title="Table View"><FiList className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="grid" title="Grid View"><FiGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="kanban" title="Kanban View"><FiColumns className="h-4 w-4" /></TabsTrigger>
                </TabsList>
            </Tabs>
          
          <Button variant="outline" size="icon" onClick={() => fetchProjectsData(pagination.page)} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          {canCreate && (
            <Button onClick={() => { setEditingProject(null); setIsSheetOpen(true); }} className="gap-2">
                <FiPlus /> New Project
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border/60 shadow-2xs p-4 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search projects..."
                className="pl-8 bg-background focus-visible:ring-violet-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            </div>
            
             <div className="flex flex-wrap items-center gap-4 ml-auto">
                 <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-muted-foreground uppercase">Status:</span>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                         <SelectTrigger className="w-[125px] h-8 bg-background focus:ring-violet-500 text-xs">
                             <SelectValue placeholder="Status" />
                         </SelectTrigger>
                         <SelectContent className="text-xs">
                             <SelectItem value="all">All Statuses</SelectItem>
                             <SelectItem value="PLANNING">Planning</SelectItem>
                             <SelectItem value="ACTIVE">Active</SelectItem>
                             <SelectItem value="ON_HOLD">On Hold</SelectItem>
                             <SelectItem value="COMPLETED">Completed</SelectItem>
                             <SelectItem value="CANCELLED">Cancelled</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>

                 <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-muted-foreground uppercase">Priority:</span>
                     <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                         <SelectTrigger className="w-[125px] h-8 bg-background focus:ring-violet-500 text-xs">
                             <SelectValue placeholder="Priority" />
                         </SelectTrigger>
                         <SelectContent className="text-xs">
                             <SelectItem value="all">All Priorities</SelectItem>
                             <SelectItem value="LOW">Low</SelectItem>
                             <SelectItem value="NORMAL">Normal</SelectItem>
                             <SelectItem value="HIGH">High</SelectItem>
                             <SelectItem value="URGENT">Urgent</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>
             </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-dashed border-muted/50">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Date:</span>
                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        value={dateFrom || ""} 
                        onChange={(e) => setDateFrom(e.target.value || undefined)}
                        className="w-[140px] h-9 bg-background py-1 focus-visible:ring-violet-500"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input 
                        type="date" 
                        value={dateTo || ""} 
                        onChange={(e) => setDateTo(e.target.value || undefined)}
                        className="w-[140px] h-9 bg-background py-1 focus-visible:ring-violet-500"
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
                    <SelectTrigger className="w-[130px] bg-background focus:ring-violet-500">
                    <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger className="w-[110px] bg-background focus:ring-violet-500">
                    <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="desc">Newest</SelectItem>
                    <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setDateFrom(undefined);
                        setDateTo(undefined);
                        setSortBy("createdAt");
                        setSortOrder("desc");
                    }}
                    className="h-9 px-3 gap-1 cursor-pointer hover:bg-muted text-xs font-semibold"
                >
                    Reset Filters
                </Button>
            </div>
        </div>
      </div>

      {projects.length === 0 && !search ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
                <EmptyState 
                    icon={FiBriefcase} 
                    title={"No Projects Yet"} 
                    description={canCreate ? "Launch your first project." : "No projects found."}
                    actionLabel={canCreate ? "Create Project" : undefined}
                    onAction={canCreate ? () => { setEditingProject(null); setIsSheetOpen(true); } : undefined}
                />
            </div>
      ) : (
        <div className="transition-all duration-300">
          {view === "table" && (
            <ProjectTable
              projects={projects}
              onEdit={(project) => { setEditingProject(project); setIsSheetOpen(true); }}
              onRefresh={() => fetchProjectsData(pagination.page)}
              page={pagination.page}
              limit={pagination.limit}
            />
          )}
          {view === "grid" && (
            <ProjectGrid 
              projects={projects}
              onEdit={(project) => { setEditingProject(project); setIsSheetOpen(true); }}
            />
          )}
          {view === "kanban" && (
            <ProjectKanban 
                initialProjects={projects} 
                onRefresh={() => fetchProjectsData(pagination.page)} 
            />
          )}
        </div>
      )}

      {(view !== "kanban") && (
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProjectsData(pagination.page - 1)}
            disabled={pagination.page <= 1 || isPending}
            >
            Previous
            </Button>
            <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
            </div>
            <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProjectsData(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isPending}
            >
            Next
            </Button>
        </div>
      )}

      {/* Project Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-[650px] border-none shadow-2xl overflow-y-auto p-0 rounded-l-3xl">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/5">
                    <SheetHeader>
                        <SheetTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                            {editingProject ? "Edit Project Overview" : "Launch Project"}
                        </SheetTitle>
                        <SheetDescription className="text-base font-medium text-muted-foreground mt-2 max-w-sm">
                            Configure your project objectives and link necessary CRM resources for unified tracking.
                        </SheetDescription>
                    </SheetHeader>
                </div>
                <div className="px-8 py-6">
                    <ProjectForm 
                        initialData={editingProject}
                        onSuccess={handleCreateSuccess}
                        onCancel={() => setIsSheetOpen(false)}
                    />
                </div>
          </SheetContent>
      </Sheet>
    </div>
  );
}
