"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiMail, FiUser, FiBriefcase } from "react-icons/fi";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LeadStatus } from "@prisma/client";

interface Props {
  lead: any;
  isOverlay?: boolean;
}

const statusMap: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
    [LeadStatus.NEW]: { label: "New", variant: "default" },
    [LeadStatus.CONTACTED]: { label: "Contacted", variant: "secondary" },
    [LeadStatus.QUALIFIED]: { label: "Qualified", variant: "success" },
    [LeadStatus.UNQUALIFIED]: { label: "Unqualified", variant: "destructive" },
    [LeadStatus.CONVERTED]: { label: "Converted", variant: "outline" },
};

export function LeadKanbanCard({ lead, isOverlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
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
        className="opacity-30 bg-muted/50 h-28 rounded-lg border-2 border-dashed border-primary"
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
          <div className="flex gap-2 items-start justify-between">
            <div className="flex gap-2 items-center">
              {lead.photo ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border bg-muted flex-shrink-0">
                  <img
                    src={`/api/files/${lead.photo}`}
                    alt={lead.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] flex-shrink-0">
                  {lead.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="font-medium text-sm leading-tight hover:underline cursor-pointer">
                <Link href={`/dashboard/crm/leads/${lead.id}`}>
                    {lead.name}
                </Link>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 -mt-1">
            <span>{lead.leadNumber}</span>
            {lead.reference && (
              <span className="text-[9px] bg-muted px-1 rounded border font-sans text-muted-foreground">
                Ref: {lead.reference}
              </span>
            )}
            {lead.Category && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/5 text-primary border-primary/10 leading-none h-auto">
                {lead.Category.name}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-[11px] text-muted-foreground truncate">
                <FiBriefcase className="h-3 w-3 mr-1" />
                {lead.company || "No Company"}
            </div>
            <div className="flex items-center text-[11px] text-muted-foreground truncate">
                <FiMail className="h-3 w-3 mr-1" />
                {lead.email}
            </div>
          </div>

          <div className="flex justify-between items-center mt-2">
            <Badge variant={statusMap[lead.status as LeadStatus]?.variant as any} className="text-[10px] px-1.5 h-4">
                {statusMap[lead.status as LeadStatus]?.label}
            </Badge>
            <div className="flex items-center text-[10px] text-muted-foreground">
                <FiUser className="h-2.5 w-2.5 mr-0.5" />
                {lead.owner?.name?.split(" ")[0] || "Unassigned"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
