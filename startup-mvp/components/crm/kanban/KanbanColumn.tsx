"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

interface Props {
  id: string;
  title: string;
  opportunities: any[];
  hasMore?: boolean;
  loading?: boolean;
  onLoadMore?: () => void;
}

export function KanbanColumn({ id, title, opportunities, hasMore, loading, onLoadMore }: Props) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-lg border">
      <div className="p-3 border-b bg-muted/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className="bg-background px-2 py-0.5 rounded text-xs font-medium border text-muted-foreground">
          {opportunities.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-3 overflow-y-auto min-h-[100px]"
      >
        <SortableContext
          items={opportunities.map((op) => op.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {opportunities.map((op) => (
              <KanbanCard key={op.id} opportunity={op} />
            ))}
          </div>
        </SortableContext>
        
        {hasMore && (
            <div className="pt-4 pb-2 flex justify-center">
                <button 
                    onClick={onLoadMore}
                    disabled={loading}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                    {loading ? "Loading..." : "Load more"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
