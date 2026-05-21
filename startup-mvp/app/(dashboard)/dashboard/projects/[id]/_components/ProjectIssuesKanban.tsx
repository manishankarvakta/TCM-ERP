"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
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
    MoreVertical,
    Edit3,
    Trash2
} from "lucide-react";
import { updateIssue } from "@/app/actions/projects/project.action";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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

interface ProjectIssuesKanbanProps {
  project: any;
  onRefresh: () => void;
  onEditIssue: (issue: any) => void;
  onDeleteIssue: (id: string) => void;
  hasOp: (key: string, op: any) => boolean;
}

const LANES = [
  { id: "OPEN", title: "Open", bg: "bg-slate-50/50 border-slate-200/60", badge: "bg-slate-100 text-slate-700" },
  { id: "IN_PROGRESS", title: "In Progress", bg: "bg-amber-50/30 border-amber-200/50", badge: "bg-amber-100 text-amber-700" },
  { id: "REVIEW", title: "Under Review", bg: "bg-blue-50/30 border-blue-200/50", badge: "bg-blue-100 text-blue-700" },
  { id: "COMPLETED", title: "Completed", bg: "bg-emerald-50/30 border-emerald-200/50", badge: "bg-emerald-100 text-emerald-700" },
  { id: "CLOSED", title: "Closed", bg: "bg-gray-100/30 border-gray-200/60", badge: "bg-gray-200 text-gray-700" },
];

function DraggableCard({ 
  issue, 
  onEdit, 
  onDelete, 
  hasOp
}: { 
  issue: Issue; 
  onEdit: (issue: any) => void; 
  onDelete: (id: string) => void; 
  hasOp: (key: string, op: any) => boolean;
}) {
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
      className={`bg-background border border-border/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative ${
        isDragging ? "opacity-40 animate-pulse" : "opacity-100"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div {...listeners} {...attributes} className="flex-1 cursor-grab active:cursor-grabbing mr-2 py-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {issue.issueNumber || `#${issue.id.substring(0, 5)}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`font-semibold text-[9px] px-2 py-0.5 rounded shadow-none ${getPriorityColor(issue.priority)}`}>
            {issue.priority}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasOp("projects.issues", "edit") && (
                <DropdownMenuItem onClick={() => onEdit(issue)} className="cursor-pointer">
                  <Edit3 className="mr-2 h-3.5 w-3.5" /> Modify
                </DropdownMenuItem>
              )}
              {(hasOp("projects.issues", "delete-permanently") || hasOp("projects.issues", "move-to-trash")) && (
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={() => onDelete(issue.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing space-y-2">
        <h5 className="text-sm font-extrabold tracking-tight line-clamp-1">
          {issue.title}
        </h5>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {issue.description || "Scoping details pending."}
        </p>

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
    </div>
  );
}

function DroppableLane({ 
  lane, 
  issues, 
  onEdit, 
  onDelete, 
  hasOp
}: { 
  lane: typeof LANES[0]; 
  issues: Issue[]; 
  onEdit: (issue: any) => void; 
  onDelete: (id: string) => void; 
  hasOp: (key: string, op: any) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-2xl p-4 flex flex-col gap-3 min-h-[450px] transition-all duration-300 ${lane.bg} ${
        isOver ? "ring-2 ring-primary/20 bg-primary/2" : ""
      }`}
    >
      <div className="flex justify-between items-center pb-2 border-b border-border/40">
        <h4 className="font-extrabold text-xs tracking-tight text-foreground flex items-center gap-2">
          {lane.title}
        </h4>
        <Badge className={`rounded-full px-2 py-0.5 text-[9px] font-bold shadow-none ${lane.badge}`}>
          {issues.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
        {issues.map((issue) => (
          <DraggableCard 
            key={issue.id} 
            issue={issue} 
            onEdit={onEdit} 
            onDelete={onDelete} 
            hasOp={hasOp}
          />
        ))}
        {issues.length === 0 && (
          <div className="py-12 text-center text-[10px] font-bold text-muted-foreground/45 border border-dashed rounded-xl border-border/60 bg-background/30">
            No active issues
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectIssuesKanban({ 
  project, 
  onRefresh, 
  onEditIssue, 
  onDeleteIssue, 
  hasOp 
}: ProjectIssuesKanbanProps) {
  const [localIssues, setLocalIssues] = useState<Issue[]>([]);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const list = project.Milestones?.flatMap((m: any) => m.Issues || []) || [];
    setLocalIssues(list);
  }, [project]);

  // Realtime Connection Hub
  useEffect(() => {
    if (!socket || !isConnected || !project?.id) return;

    const room = `entity:project:${project.id}`;
    socket.emit("join_room", { room });

    const handleRefresh = (payload: any) => {
        // Prevent refreshing if this exact client initiated the update
        if (payload?.actorId === socket.auth?.userId && payload?.metadata?.optimistic) return;
        console.log("[Kanban] Realtime Sync Triggered:", payload);
        onRefresh();
    };

    socket.on("ISSUE_UPDATED", handleRefresh);
    socket.on("ISSUE_CREATED", handleRefresh);
    socket.on("ISSUE_DELETED", handleRefresh);

    return () => {
        socket.off("ISSUE_UPDATED", handleRefresh);
        socket.off("ISSUE_CREATED", handleRefresh);
        socket.off("ISSUE_DELETED", handleRefresh);
        socket.emit("leave_room", { room });
    };
  }, [socket, isConnected, project?.id, onRefresh]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const targetStatus = over.id as string;

    const issue = localIssues.find((i) => i.id === issueId);
    if (!issue || issue.status === targetStatus) return;

    // Optimistic UI update
    const previousIssues = [...localIssues];
    setLocalIssues((current) =>
      current.map((i) =>
        i.id === issueId ? { ...i, status: targetStatus } : i
      )
    );

    const res = await updateIssue(issueId, { status: targetStatus });
    if (res.success) {
      toast.success(`Ticket status updated to ${targetStatus}`);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to update ticket status");
      setLocalIssues(previousIssues);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {LANES.map((lane) => {
          const laneIssues = localIssues.filter((i) => i.status === lane.id);
          return (
            <DroppableLane 
              key={lane.id} 
              lane={lane} 
              issues={laneIssues} 
              onEdit={onEditIssue} 
              onDelete={onDeleteIssue} 
              hasOp={hasOp}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
