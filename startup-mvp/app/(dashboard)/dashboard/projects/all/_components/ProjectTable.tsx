"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { FiMoreVertical, FiEdit, FiCheckCircle, FiEye } from "react-icons/fi";
import { updateProject } from "@/app/actions/projects/project.action";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  "PLANNING": { label: "Planning", variant: "secondary" },
  "ACTIVE": { label: "Active", variant: "success" },
  "ON_HOLD": { label: "On Hold", variant: "outline" },
  "COMPLETED": { label: "Completed", variant: "default" },
  "CANCELLED": { label: "Cancelled", variant: "destructive" },
};

export default function ProjectTable({ projects, onEdit, onRefresh, page = 1, limit = 10 }: { projects: any[], onEdit: (p: any) => void, onRefresh: () => void, page?: number, limit?: number }) {
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const result = await updateProject(id, { status: newStatus });
      if (result.success) {
        toast.success(`Status updated to ${statusMap[newStatus]?.label || newStatus}`);
        onRefresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">SL</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Project Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No projects found.
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project, idx) => (
              <TableRow key={project.id}>
                <TableCell className="text-center font-mono text-xs text-muted-foreground font-bold">
                  {String((page - 1) * limit + idx + 1).padStart(2, "0")}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {project.projectNumber || "-"}
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/projects/${project.id}`} className="hover:underline text-primary">
                    {project.title}
                  </Link>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {project.Client ? (
                            <>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={project.Client.image} />
                                    <AvatarFallback className="text-[10px]">{project.Client.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{project.Client.name}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground italic text-sm">Internal</span>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                          <AvatarImage src={project.Owner?.image} />
                          <AvatarFallback className="text-[10px]">{project.Owner?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{project.Owner?.name || "Unassigned"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[project.status]?.variant || "default" as any}>
                    {statusMap[project.status]?.label || project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">
                  {project.budget ? `$${project.budget.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/projects/${project.id}`} className="w-full flex items-center">
                          <FiEye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(project)}>
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FiCheckCircle className="mr-2 h-4 w-4" />
                          Change Status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup value={project.status} onValueChange={(val) => handleStatusUpdate(project.id, val)}>
                            {Object.entries(statusMap).map(([status, { label }]) => (
                                <DropdownMenuRadioItem key={status} value={status}>
                                    {label}
                                </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
