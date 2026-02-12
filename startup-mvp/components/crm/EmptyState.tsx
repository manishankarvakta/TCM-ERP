import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import React from "react";

interface EmptyStateProps {
  icon: React.ElementType | LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  // Optional: support for rendering a custom action component (like a DialogTrigger)
  actionComponent?: React.ReactNode; 
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionComponent,
}: EmptyStateProps) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        
        {actionComponent ? (
          actionComponent
        ) : actionLabel && onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : null}
      </div>
    </div>
  );
}
