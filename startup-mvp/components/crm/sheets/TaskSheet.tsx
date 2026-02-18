"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskForm } from "../forms/TaskForm";

interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  entityType: string;
  entityId: string;
  mode?: "create" | "edit";
}

export function TaskSheet({
  open,
  onOpenChange,
  task,
  entityType,
  entityId,
  mode = "create",
}: TaskSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "New Task" : "Edit Task"}
          </SheetTitle>
        </SheetHeader>
        <TaskForm
          task={task}
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
