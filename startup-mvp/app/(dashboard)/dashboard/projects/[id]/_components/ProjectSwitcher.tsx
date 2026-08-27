"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSwitcherProps {
  currentProjectId: string;
  projects: any[];
  currentProjectTitle: string;
  currentProjectStatus: string;
}

const statusColorMap: Record<string, { dot: string; text: string }> = {
  PLANNING: { dot: "bg-blue-500", text: "text-blue-500" },
  ACTIVE: { dot: "bg-emerald-500 animate-pulse", text: "text-emerald-500" },
  ON_HOLD: { dot: "bg-amber-500", text: "text-amber-500" },
  COMPLETED: { dot: "bg-slate-500", text: "text-slate-500" },
  CANCELLED: { dot: "bg-rose-500", text: "text-rose-500" },
};

export function ProjectSwitcher({
  currentProjectId,
  projects,
  currentProjectTitle,
  currentProjectStatus,
}: ProjectSwitcherProps) {
  const router = useRouter();

  const options: SearchableSelectOption[] = React.useMemo(() => {
    return projects.map((p) => ({
      value: p.id,
      label: p.title,
      description: p.Client?.name || "Internal",
    }));
  }, [projects]);

  const handleSelect = (val: string | null) => {
    if (val && val !== currentProjectId) {
      router.push(`/dashboard/projects/${val}`);
    }
  };

  const renderOption = (option: SearchableSelectOption) => {
    const project = projects.find((p) => p.id === option.value);
    const status = project?.status || "PLANNING";
    const statusDetails = statusColorMap[status] || { dot: "bg-slate-400", text: "text-slate-400" };

    return (
      <div className="flex items-center justify-between w-full py-1 text-left">
        <div className="flex flex-col min-w-0 pr-4">
          <span className="font-bold text-sm truncate text-foreground text-left">{option.label}</span>
          {option.description && (
            <span className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-semibold text-left">
              {option.description}
            </span>
          )}
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDetails.dot)} />
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <div className="p-2 bg-primary/5 rounded-xl text-primary border border-primary/10">
        <FolderKanban className="h-5 w-5" />
      </div>
      <div className="min-w-[200px] max-w-[320px] md:max-w-[400px]">
        <SearchableSelect
          options={options}
          value={currentProjectId}
          onValueChange={handleSelect}
          placeholder="Select Project..."
          searchPlaceholder="Search projects..."
          emptyMessage="No projects found."
          className="h-11 border-border/60 rounded-xl hover:bg-muted/40 transition-colors shadow-xs font-bold text-base bg-background/50 pl-3.5 pr-2 w-full justify-between"
          allowClear={false}
          disablePortal={true}
          renderOption={renderOption}
        />
      </div>
    </div>
  );
}
