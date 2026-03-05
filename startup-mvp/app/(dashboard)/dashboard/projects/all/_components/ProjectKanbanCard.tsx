"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { FiMoreVertical, FiClock, FiEye, FiEdit } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectKanbanCardProps {
  project: any;
  isOverlay?: boolean;
}

export function ProjectKanbanCard({ project, isOverlay }: ProjectKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="h-32 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group cursor-grab hover:border-primary/50 transition-colors shadow-sm bg-card ${
        isOverlay ? 'rotate-2 scale-105 shadow-xl ring-2 ring-primary/20' : ''
      }`}
    >
      <CardHeader className="p-3 pb-2 space-y-0 relative">
          <div className="flex flex-col justify-start items-start gap-1">
            {project.projectNumber && (
                <span className="text-[9px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                    {project.projectNumber}
                </span>
            )}
            <Link 
              href={`/dashboard/projects/${project.id}`} 
              className="font-bold text-sm hover:underline decoration-primary underline-offset-2 line-clamp-1 pr-6"
              onClick={(e) => e.stopPropagation()}
            >
              {project.title}
            </Link>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-2">
              {project.Client ? (
                  <>
                    <Avatar className="h-3.5 w-3.5">
                        <AvatarImage src={project.Client.image} />
                        <AvatarFallback className="text-[7px]">{project.Client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{project.Client.name}</span>
                  </>
              ) : (
                  <span className="italic">Internal</span>
              )}
          </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-3">
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Milestones</span>
                <span>{project._count?.Milestones || 0}</span>
            </div>
            <Progress value={(project._count?.Milestones || 0) * 10} className="h-1" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center text-[10px] text-muted-foreground">
            <FiClock className="mr-1 h-2.5 w-2.5" />
            {format(new Date(project.createdAt), "MMM d")}
          </div>
          <Avatar className="h-5 w-5 border border-background">
            <AvatarImage src={project.Owner?.image} />
            <AvatarFallback className="text-[8px]">{project.Owner?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
