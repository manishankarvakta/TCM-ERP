"use client";

import { useState, useTransition } from "react";
import { 
    DndContext, 
    DragEndEvent, 
    useDroppable, 
    useDraggable 
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
    CheckSquare
} from "lucide-react";
import { getAllIssues, updateIssue } from "@/app/actions/projects/project.action";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

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
  { id: "OPEN", title: "Open", bg: "bg-slate-50/50 border-slate-200/60", badge: "bg-slate-100 text-slate-700" },
  { id: "IN_PROGRESS", title: "In Progress", bg: "bg-amber-50/30 border-amber-200/50", badge: "bg-amber-100 text-amber-700" },
  { id: "REVIEW", title: "Under Review", bg: "bg-blue-50/30 border-blue-200/50", badge: "bg-blue-100 text-blue-700" },
  { id: "COMPLETED", title: "Completed", bg: "bg-emerald-50/30 border-emerald-200/50", badge: "bg-emerald-100 text-emerald-700" },
  { id: "CLOSED", title: "Closed", bg: "bg-gray-100/30 border-gray-200/60", badge: "bg-gray-200 text-gray-700" },
];

function DraggableCard({ issue }: { issue: Issue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL": return "text-rose-500 border-rose-200 bg-rose-50";
      case "HIGH": return "text-amber-500 border-amber-200 bg-amber-50";
      case "NORMAL": return "text-blue-500 border-blue-200 bg-blue-50";
      default: return "text-slate-500 border-slate-200 bg-slate-50";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-background border border-border/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {issue.issueNumber || `#${issue.id.substring(0, 5)}`}
        </span>
        <Badge variant="outline" className={`font-semibold text-[9px] px-2 py-0.5 rounded ${getPriorityColor(issue.priority)}`}>
          {issue.priority}
        </Badge>
      </div>

      <h5 className="text-sm font-extrabold tracking-tight mb-2 line-clamp-1 group-hover:text-primary transition-colors">
        {issue.title}
      </h5>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
        {issue.description || "Scoping details pending."}
      </p>

      {/* Project & Milestone tags */}
      <div className="space-y-1.5 mb-4 bg-muted/20 p-2 rounded-lg border border-border/40 text-[10px] font-semibold text-muted-foreground/80">
        <div className="flex items-center gap-1.5 truncate">
          <Folder className="h-3 w-3 text-primary/60 shrink-0" />
          <Link href={`/dashboard/projects/${issue.Milestone?.Project?.id}`} className="hover:text-primary transition-colors truncate">
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

function DroppableLane({ lane, issues }: { lane: typeof LANES[0]; issues: Issue[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-[320px] shrink-0 border rounded-2xl p-4 flex flex-col gap-3 min-h-[600px] transition-all duration-300 ${lane.bg} ${
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
          <DraggableCard key={issue.id} issue={issue} />
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

export default function IssuesKanban({ initialIssues }: IssuesKanbanProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

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

  const handleDragEnd = async (event: DragEndEvent) => {
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

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            placeholder="Search tickets by title, number, project..."
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
          {["all", "CRITICAL", "HIGH", "NORMAL", "LOW"].map((prio) => (
            <Button
              key={prio}
              variant={priorityFilter === prio ? "default" : "outline"}
              onClick={() => setPriorityFilter(prio)}
              className="h-9 rounded-full px-4 text-xs font-bold capitalize transition-all"
            >
              {prio === "all" ? "All Priorities" : prio.toLowerCase()}
            </Button>
          ))}
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

      {/* DndContext Container */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 items-start scrollbar-thin">
          {LANES.map((lane) => {
            const laneIssues = filteredIssues.filter((i) => i.status === lane.id);
            return (
              <DroppableLane key={lane.id} lane={lane} issues={laneIssues} />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
