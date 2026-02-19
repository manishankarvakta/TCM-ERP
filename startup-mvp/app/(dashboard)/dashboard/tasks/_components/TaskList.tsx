"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiEdit2, FiTrash2, FiClock, FiCheckCircle, FiCircle } from "react-icons/fi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: any[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: any) => void;
}

export function TaskList({ tasks, onDelete, onStatusChange, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <FiCheckCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No tasks found</h3>
          <p className="text-muted-foreground">Get started by creating your first task.</p>
        </div>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <FiCheckCircle className="text-green-500" />;
      case "in-progress":
        return <FiClock className="text-blue-500" />;
      default:
        return <FiCircle className="text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white hover:bg-red-600";
      case "high":
        return "bg-orange-500 text-white hover:bg-orange-600";
      case "medium":
        return "bg-blue-500 text-white hover:bg-blue-600";
      default:
        return "bg-slate-500 text-white hover:bg-slate-600";
    }
  };

  return (
    <div className="grid gap-4">
      {tasks.map((task) => (
        <Card key={task.id} className={cn("p-4 transition-all hover:shadow-md", task.status === "completed" && "opacity-75")}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <button 
                onClick={() => onStatusChange(task.id, task.status === "completed" ? "todo" : "completed")}
                className="mt-1 hover:scale-110 transition-transform"
              >
                {getStatusIcon(task.status)}
              </button>
              <div className="space-y-1">
                <h4 className={cn("font-semibold leading-none", task.status === "completed" && "line-through text-muted-foreground")}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <Badge variant="secondary" className={cn("text-[10px] uppercase font-bold", getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FiClock className="h-3 w-3" />
                      {format(new Date(task.dueDate), "MMM dd, yyyy")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    By {task.User?.name || "System"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                <FiEdit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
