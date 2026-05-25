"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Search, 
    Calendar, 
    Briefcase, 
    RotateCw,
    X,
    LayoutGrid,
    List
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllMilestones } from "@/app/actions/projects/project.action";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { ClickUpItemModal } from "@/components/projects/shared/ClickUpItemModal";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string | Date;
  order: number;
  Project: {
    id: string;
    title: string;
    status: string;
  };
  Issues: any[];
}

interface MilestonesManagerProps {
  initialMilestones: Milestone[];
}

export default function MilestonesManager({ initialMilestones }: MilestonesManagerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [isPending, startTransition] = useTransition();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSync = async () => {
    startTransition(async () => {
      const result = await getAllMilestones("all");
      if (result.success) {
        setMilestones((result.milestones || []) as any[]);
        toast.success("Milestones synchronized");
      } else {
        toast.error("Failed to sync milestones");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNED": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[9px] tracking-wider px-2.5 py-0.5">Planned</Badge>;
      case "IN_PROGRESS": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse font-bold uppercase text-[9px] tracking-wider px-2.5 py-0.5">In Progress</Badge>;
      case "COMPLETED": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase text-[9px] tracking-wider px-2.5 py-0.5">Completed</Badge>;
      case "DELAYED": return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold uppercase text-[9px] tracking-wider px-2.5 py-0.5">Delayed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMilestones = milestones.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
                          (m.Project?.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            placeholder="Search milestones or projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border/60 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["all", "PLANNED", "IN_PROGRESS", "COMPLETED", "DELAYED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className="h-9 rounded-full px-4 text-xs font-bold capitalize transition-all"
            >
              {status === "all" ? "All Phases" : status.toLowerCase().replace("_", " ")}
            </Button>
          ))}
          <div className="flex items-center ml-2 border border-border/60 rounded-full p-0.5 bg-muted/20">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
              className={`h-8 w-8 rounded-full ${view === "list" ? 'shadow-sm' : 'text-muted-foreground'}`}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("grid")}
              className={`h-8 w-8 rounded-full ${view === "grid" ? 'shadow-sm' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={isPending}
            className="h-9 w-9 rounded-full ml-2 border border-border/60 hover:bg-muted"
          >
            <RotateCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* List/Grid or Empty State */}
      {filteredMilestones.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed rounded-[2rem] bg-muted/20 border-border/80 group">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold tracking-tight">No milestones found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            Try adjusting your search criteria or filter configuration to discover registered roadmap phases.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMilestones.map((milestone) => (
            <Card key={milestone.id} className="hover:shadow-lg transition-all border-border/50 bg-card rounded-2xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-6">
                  {/* Project Context */}
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <Link 
                      href={`/dashboard/projects/${milestone.Project?.id}`} 
                      className="text-xs font-bold text-muted-foreground hover:text-primary uppercase tracking-widest truncate"
                    >
                      {milestone.Project?.title || "Independent"}
                    </Link>
                  </div>

                  {/* Milestone Title */}
                  <h4 
                    className="text-lg font-bold tracking-tight mb-2 group-hover:text-primary transition-colors cursor-pointer hover:underline"
                    onClick={() => {
                      setSelectedMilestone(milestone);
                      setIsModalOpen(true);
                    }}
                  >
                    {milestone.title}
                  </h4>

                  {/* Milestone Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 leading-relaxed font-medium">
                    {milestone.description || "No scoping details compiled for this project phase."}
                  </p>

                  {/* Due Date & Status */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      <span>{milestone.dueDate ? format(new Date(milestone.dueDate), 'PPP') : 'UNSCHEDULED'}</span>
                    </div>
                    {getStatusBadge(milestone.status)}
                  </div>
                </div>

                {/* Footer status summary bar */}
                <div className="bg-muted/30 p-4 px-6 border-t border-border/40 flex items-center justify-between text-xs font-bold text-muted-foreground/70 uppercase">
                  <span>Issues Logged</span>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 font-bold">
                    {milestone.Issues?.length || 0} Issues
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[30%]">Milestone</TableHead>
                <TableHead className="w-[20%]">Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMilestones.map((milestone) => (
                <TableRow key={milestone.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary hover:underline transition-colors w-fit"
                        onClick={() => {
                          setSelectedMilestone(milestone);
                          setIsModalOpen(true);
                        }}
                      >
                        {milestone.title}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{milestone.description || "No details provided"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/dashboard/projects/${milestone.Project?.id}`} 
                      className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 truncate"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      {milestone.Project?.title || "Independent"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(milestone.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d, yyyy') : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {milestone.Issues?.length || 0}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal for viewing/editing milestone */}
      {isModalOpen && selectedMilestone && (
        <ClickUpItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMilestone(null);
          }}
          entityType="milestone"
          initialData={selectedMilestone}
          onRefresh={handleSync}
        />
      )}
    </div>
  );
}
