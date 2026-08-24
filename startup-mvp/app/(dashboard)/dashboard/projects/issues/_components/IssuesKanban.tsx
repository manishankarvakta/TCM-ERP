"use client";

import { useState, useTransition } from "react";
import { 
    DndContext, 
    DragEndEvent, 
    useDroppable, 
    useDraggable,
    DragOverlay,
    DragStartEvent
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Search, 
    AlertCircle, 
    RotateCw,
    X,
    Folder,
    User,
    CheckSquare,
    XCircle
} from "lucide-react";
import { getAllIssues, updateIssue } from "@/app/actions/projects/project.action";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClickUpItemModal } from "@/components/projects/shared/ClickUpItemModal";
import React, { useMemo } from "react";

interface Issue {
  id: string;
  issueNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  milestoneId: string;
  assigneeId?: string;
  createdAt: string | Date;
  Milestone: {
    title: string;
    Project: {
      id: string;
      title: string;
    };
  };
  Assignee?: {
    id: string;
    name: string;
    image?: string;
  };
  Reporter: {
    id: string;
    name: string;
  };
}

interface IssuesKanbanProps {
  initialIssues: Issue[];
}

const LANES = [
  { id: "OPEN",        title: "Todo",        bg: "bg-slate-50/50 border-slate-200/60 dark:bg-slate-900/10",  ring: "ring-slate-250",  badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { id: "IN_PROGRESS", title: "In Progress",  bg: "bg-amber-50/30 border-amber-200/50 dark:bg-amber-950/5", ring: "ring-amber-250",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { id: "REVIEW",      title: "In Review",    bg: "bg-blue-50/30 border-blue-200/50 dark:bg-blue-950/5",    ring: "ring-blue-250",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { id: "COMPLETED",   title: "Done",         bg: "bg-emerald-50/30 border-emerald-200/50 dark:bg-emerald-950/5", ring: "ring-emerald-250", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
];

function DraggableCard({ issue, onView }: { issue: Issue; onView?: (i: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    position: 'relative' as const,
  } : undefined;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL": return "text-rose-500 border-rose-200 bg-rose-50";
      case "HIGH": return "text-amber-500 border-amber-200 bg-amber-50";
      case "NORMAL": return "text-blue-500 border-blue-200 bg-blue-50";
      default: return "text-slate-500 border-slate-200 bg-slate-50";
    }
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-muted/15 border border-dashed border-border/80 rounded-xl h-[130px] transition-all"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onView?.(issue)}
      className={`group bg-background border border-border/60 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer ${
        isDragging ? "opacity-40 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div {...listeners} {...(attributes || {})} className="flex-1 min-w-0 cursor-grab active:cursor-grabbing pr-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            {issue.issueNumber || `#${issue.id.substring(0, 5)}`}
          </span>
          <h5 className="text-sm font-extrabold tracking-tight mt-0.5 line-clamp-1">
            {issue.title}
          </h5>
        </div>
        <Badge variant="outline" className={`font-semibold text-[9px] px-2 py-0.5 rounded shrink-0 ${getPriorityColor(issue.priority)}`}>
          {issue.priority}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
        {issue.description || "Scoping details pending."}
      </p>

      {/* Project & Milestone tags */}
      <div className="space-y-1.5 mb-4 bg-muted/20 p-2 rounded-lg border border-border/40 text-[10px] font-semibold text-muted-foreground/80">
        <div className="flex items-center gap-1.5 truncate">
          <Folder className="h-3 w-3 text-primary/60 shrink-0" />
          <Link 
            href={`/dashboard/projects/${issue.Milestone?.Project?.id}`} 
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary transition-colors truncate"
          >
            {issue.Milestone?.Project?.title || "Project"}
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={issue.Assignee?.image} />
            <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
              {issue.Assignee?.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">
            {issue.Assignee?.name || "Unassigned"}
          </span>
        </div>
        <span className="text-[9px] font-bold text-muted-foreground/60">
          {format(new Date(issue.createdAt), "MMM d")}
        </span>
      </div>
    </div>
  );
}

function DroppableLane({ lane, issues, onView }: { lane: typeof LANES[0]; issues: Issue[]; onView?: (i: any) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full flex flex-col gap-3 min-h-[600px] transition-all duration-300 border rounded-2xl p-4 ${lane.bg} ${
        isOver ? "ring-2 ring-primary/20 bg-primary/2" : ""
      }`}
    >
      <div className="flex justify-between items-center pb-2 border-b border-border/40">
        <h4 className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-2">
          {lane.title}
        </h4>
        <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-none ${lane.badge}`}>
          {issues.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-[700px] pr-1">
        {issues.map((issue) => (
          <DraggableCard key={issue.id} issue={issue} onView={onView} />
        ))}
        {issues.length === 0 && (
          <div className="py-12 text-center text-xs font-semibold text-muted-foreground/40 border border-dashed rounded-xl border-border/60">
            No cards
          </div>
        )}
      </div>
    </div>
  );
}

function DragOverlayCardContent({ issue }: { issue: Issue }) {
  const getPriorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL": return "text-rose-500 border-rose-200 bg-rose-50";
      case "HIGH": return "text-amber-500 border-amber-200 bg-amber-50";
      case "NORMAL": return "text-blue-500 border-blue-200 bg-blue-50";
      default: return "text-slate-500 border-slate-200 bg-slate-50";
    }
  };

  return (
    <div className="bg-background border border-border/60 p-4 rounded-xl shadow-md text-left">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            {issue.issueNumber || `#${issue.id.substring(0, 5)}`}
          </span>
          <h5 className="text-sm font-extrabold tracking-tight mt-0.5 line-clamp-1">
            {issue.title}
          </h5>
        </div>
        <Badge variant="outline" className={`font-semibold text-[9px] px-2 py-0.5 rounded shrink-0 ${getPriorityColor(issue.priority)}`}>
          {issue.priority}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
        {issue.description || "Scoping details pending."}
      </p>

      <div className="space-y-1.5 mb-4 bg-muted/20 p-2 rounded-lg border border-border/40 text-[10px] font-semibold text-muted-foreground/80">
        <div className="flex items-center gap-1.5 truncate">
          <Folder className="h-3 w-3 text-primary/60 shrink-0" />
          <span className="truncate">{issue.Milestone?.Project?.title || "Project"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={issue.Assignee?.image} />
            <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
              {issue.Assignee?.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">
            {issue.Assignee?.name || "Unassigned"}
          </span>
        </div>
        <span className="text-[9px] font-bold text-muted-foreground/60">
          {format(new Date(issue.createdAt), "MMM d")}
        </span>
      </div>
    </div>
  );
}

export default function IssuesKanban({ initialIssues }: IssuesKanbanProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  
  // Drag State
  const [activeId, setActiveId] = useState<string | null>(null);

  // Detail Modal States
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Dynamically compile active projects list
  const activeProjectsList = useMemo(() => {
    const pMap = new Map();
    issues.forEach((i) => {
      const p = i.Milestone?.Project;
      if (p?.id && p?.title) {
        pMap.set(p.id, p.title);
      }
    });
    return Array.from(pMap.entries()).map(([id, title]) => ({ id, title }));
  }, [issues]);

  const handleSync = async () => {
    startTransition(async () => {
      const result = await getAllIssues("all");
      if (result.success) {
        setIssues((result.issues || []) as any[]);
        toast.success("Kanban board synchronized");
      } else {
        toast.error("Failed to sync board");
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const targetStatus = over.id as string;

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === targetStatus) return;

    // Optimistic UI update
    const previousIssues = [...issues];
    setIssues((currentIssues) =>
      currentIssues.map((i) =>
        i.id === issueId ? { ...i, status: targetStatus } : i
      )
    );

    // Call server action to commit change
    const res = await updateIssue(issueId, { status: targetStatus });
    if (res.success) {
      toast.success(`Ticket status updated to ${targetStatus}`);
    } else {
      toast.error(res.error || "Failed to update ticket status");
      // Rollback on error
      setIssues(previousIssues);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      (issue.issueNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (issue.Milestone?.Project?.title || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority =
      priorityFilter === "all" || issue.priority === priorityFilter;

    const matchesProject =
      projectFilter === "all" || issue.Milestone?.Project?.id === projectFilter;

    return matchesSearch && matchesPriority && matchesProject;
  });

  return (
    <div className="space-y-6">
      {/* Controls Container */}
      <div className="bg-card border border-border/60 shadow-2xs p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-violet-500" />
          <input
            placeholder="Search tickets by title, number, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border/70 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Project filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Project:</span>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-background focus:ring-violet-500/20">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Projects</SelectItem>
                {activeProjectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Priority:</span>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs bg-background focus:ring-violet-500/20">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSync}
            disabled={isPending}
            className="h-9 w-9 rounded-lg border border-border/60 hover:bg-muted cursor-pointer shrink-0"
            title="Sync board"
          >
            <RotateCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setPriorityFilter("all");
              setProjectFilter("all");
            }}
            className="h-9 px-3 gap-1 hover:bg-muted text-xs font-semibold cursor-pointer shrink-0"
          >
            <XCircle className="h-3.5 w-3.5" /> Clear Filters
          </Button>
        </div>
      </div>

      {/* DndContext Container */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 items-start w-full">
          {LANES.map((lane) => {
            const laneIssues = filteredIssues.filter((i) => {
              if (lane.id === "COMPLETED") {
                return i.status === "COMPLETED" || i.status === "CLOSED";
              }
              return i.status === lane.id;
            });
            return (
              <DroppableLane key={lane.id} lane={lane} issues={laneIssues} onView={(issue) => {
                setSelectedIssue(issue);
                setIsModalOpen(true);
              }} />
            );
          })}
        </div>

        <DragOverlay adjustScale={false}>
          {activeId ? (
            <div className="opacity-95 scale-[1.03] z-[9999] pointer-events-none rotate-1 shadow-lg w-[300px]">
              <DragOverlayCardContent issue={issues.find((i) => i.id === activeId)!} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Preview Modal */}
      {selectedIssue && (
        <ClickUpItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedIssue(null);
          }}
          entityType="issue"
          initialData={selectedIssue}
          onRefresh={handleSync}
        />
      )}
    </div>
  );
}
