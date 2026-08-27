"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProject } from "@/app/actions/projects/project.action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProjectStatusSelectorProps {
  projectId: string;
  currentStatus: string;
}

const statusOptions = [
  { value: "DRAFT", label: "Draft", colorClass: "bg-slate-500", textClass: "text-slate-700 dark:text-slate-300" },
  { value: "PLANNING", label: "Planning", colorClass: "bg-blue-500", textClass: "text-blue-700 dark:text-blue-300" },
  { value: "ACTIVE", label: "Active", colorClass: "bg-emerald-500", textClass: "text-emerald-700 dark:text-emerald-300" },
  { value: "ON_HOLD", label: "On Hold", colorClass: "bg-amber-500", textClass: "text-amber-700 dark:text-amber-300 font-semibold" },
  { value: "COMPLETED", label: "Completed", colorClass: "bg-indigo-500", textClass: "text-indigo-700 dark:text-indigo-300 font-bold" },
  { value: "CANCELLED", label: "Cancelled", colorClass: "bg-rose-500", textClass: "text-rose-700 dark:text-rose-300 font-bold" },
  { value: "ARCHIVED", label: "Archived", colorClass: "bg-zinc-500", textClass: "text-zinc-700 dark:text-zinc-300" },
];

export function ProjectStatusSelector({ projectId, currentStatus }: ProjectStatusSelectorProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState(currentStatus);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await updateProject(projectId, { status: newStatus });
      if (res.success) {
        setStatus(newStatus);
        toast.success(`Project status updated to ${newStatus}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update project status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currentOption = statusOptions.find((opt) => opt.value === status) || statusOptions[1];

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="w-[140px] h-9 border-border/60 rounded-xl hover:bg-muted/40 font-bold text-xs justify-between">
          <div className="flex items-center gap-2 truncate">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <span className={`h-2 w-2 rounded-full shrink-0 ${currentOption.colorClass}`} />
            )}
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${opt.colorClass}`} />
                <span className={opt.textClass}>{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
