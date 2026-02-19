"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
  opportunity: any;
  isOverlay?: boolean;
}

export function KanbanCard({ opportunity, isOverlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: {
      type: "Opportunity",
      opportunity,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-muted/50 h-24 rounded-lg border-2 border-dashed border-primary"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isOverlay && "opacity-80 scale-105"
      )}
    >
      <Card className="hover:border-primary/50 transition-colors shadow-sm bg-card">
        <CardContent className="p-3 space-y-2">
          <div className="font-medium text-sm leading-tight hover:underline cursor-pointer">
            <Link href={`/dashboard/crm/opportunities/${opportunity.id}`}>
                {opportunity.title}
            </Link>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
             <div className="flex items-center truncate max-w-[140px]">
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{opportunity.client?.name || "No Client"}</span>
             </div>
             {opportunity.opportunityNumber && (
                <span className="text-[10px] font-mono bg-muted px-1 rounded border ml-1 flex-shrink-0">
                    {opportunity.opportunityNumber}
                </span>
             )}
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center text-xs font-semibold text-primary">
              <DollarSign className="h-3 w-3" />
              {Number(opportunity.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {opportunity.contact && (
                <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {opportunity.contact.firstName} {opportunity.contact.lastName}
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
