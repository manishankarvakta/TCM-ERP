"use client";

import React from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Edit2, Trash2 } from "lucide-react";
import { GanttNode } from "./types";

interface GanttRowActionsProps {
  node: GanttNode;
  onAddChild?: (parentId: string, parentType: string) => void;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

export function GanttRowActions({ node, onAddChild, onEdit, onDelete }: GanttRowActionsProps) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onAddChild && node.type !== "subtask" && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:bg-slate-100 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.id, node.type);
          }}
          title={`Add ${node.type === "milestone" ? "Issue" : node.type === "issue" ? "Task" : "Subtask"}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:bg-slate-100 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onEdit && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(node.id); }}>
              <Edit2 className="mr-2 h-4 w-4" />
              <span>Edit Details</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onDelete && (
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onSelect={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
