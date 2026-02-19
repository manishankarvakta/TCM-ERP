"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiRefreshCcw } from "react-icons/fi";
import { getTasks, deleteTask, updateTask } from "@/app/actions/system/task.action";
import { toast } from "sonner";
import { TaskList } from "./TaskList";
import { TaskForm } from "./TaskForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string | null | Date;
  User?: {
    name: string | null;
  };
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchData = () => {
    startTransition(async () => {
      const res = await getTasks(1, 100);
      if (res.success) setTasks(res.tasks || []);
      else toast.error(res.error || "Failed to load tasks");
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    startTransition(async () => {
      const result = await deleteTask(id);
      if (result.success) {
        toast.success("Task deleted");
        fetchData();
      } else {
        toast.error(result.error || "Failed to delete task");
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      const result = await updateTask(id, { status });
      if (result.success) {
        toast.success(`Task marked as ${status}`);
        fetchData();
      } else {
        toast.error(result.error || "Failed to update task");
      }
    });
  };

  const handleSuccess = () => {
    setIsDrawerOpen(false);
    setEditingTask(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage your personal and system tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingTask(null); setIsDrawerOpen(true); }} className="gap-2">
            <FiPlus /> New Task
          </Button>
        </div>
      </div>

      <TaskList 
        tasks={tasks} 
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onEdit={(task: any) => { setEditingTask(task); setIsDrawerOpen(true); }}
      />

      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details." : "Create a new task to stay organized."}
            </DialogDescription>
          </DialogHeader>
          <TaskForm 
            onSuccess={handleSuccess}
            onCancel={() => setIsDrawerOpen(false)}
            initialData={editingTask}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
