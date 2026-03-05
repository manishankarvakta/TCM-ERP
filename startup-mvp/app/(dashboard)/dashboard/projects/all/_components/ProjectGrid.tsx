"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FiMoreVertical,
  FiEye,
  FiEdit,
  FiClock
} from "react-icons/fi";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  "PLANNING": { label: "Planning", variant: "secondary" },
  "ACTIVE": { label: "Active", variant: "success" },
  "ON_HOLD": { label: "On Hold", variant: "outline" },
  "COMPLETED": { label: "Completed", variant: "default" },
  "CANCELLED": { label: "Cancelled", variant: "destructive" },
};

export default function ProjectGrid({ projects, onEdit }: { projects: any[], onEdit: (p: any) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <Card key={project.id} className="group hover:border-primary/50 transition-all shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                {project.projectNumber && (
                    <div className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase mb-1">
                        {project.projectNumber}
                    </div>
                )}
                <Link 
                  href={`/dashboard/projects/${project.id}`} 
                  className="font-bold text-lg hover:underline decoration-primary underline-offset-4 line-clamp-1"
                >
                  {project.title}
                </Link>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                    {project.Client ? (
                        <>
                            <Avatar className="h-4 w-4">
                                <AvatarImage src={project.Client.image} />
                                <AvatarFallback className="text-[8px]">{project.Client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{project.Client.name}</span>
                        </>
                    ) : (
                        <span>Internal</span>
                    )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <FiMoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/projects/${project.id}`} className="flex items-center">
                      <FiEye className="mr-2 h-4 w-4" /> View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <FiEdit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {project.description || "No description provided."}
            </p>
            
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Milestones</span>
                    <span>{project._count?.Milestones || 0}</span>
                </div>
                <Progress value={(project._count?.Milestones || 0) * 10} className="h-1.5" />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Badge variant={statusMap[project.status]?.variant || "default" as any}>
                {statusMap[project.status]?.label || project.status}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <FiClock className="mr-1 h-3 w-3" />
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 border-t bg-muted/5 flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground py-2 gap-2">
              <Avatar className="h-5 w-5">
                  <AvatarImage src={project.Owner?.image} />
                  <AvatarFallback className="text-[10px]">{project.Owner?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span>{project.Owner?.name || "Unassigned"}</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
                {project.budget ? `$${(project.budget/1000).toFixed(1)}k` : "-"}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
