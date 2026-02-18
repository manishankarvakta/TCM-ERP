"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiEdit2, FiTrash2, FiFileText, FiClock } from "react-icons/fi";
import { format } from "date-fns";

interface DocListProps {
  docs: any[];
  onDelete: (id: string) => void;
  onEdit: (doc: any) => void;
}

export function DocList({ docs, onDelete, onEdit }: DocListProps) {
  if (docs.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <FiFileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No documents found</h3>
          <p className="text-muted-foreground">Start by creating your first technical document.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {docs.map((doc) => (
        <Card key={doc.id} className="p-5 flex flex-col h-full transition-all hover:shadow-md border-l-4 border-l-primary/50">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h4 className="font-bold text-lg leading-tight line-clamp-2">{doc.title}</h4>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(doc)}>
                <FiEdit2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                onClick={() => onDelete(doc.id)}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 text-[13px] text-foreground/60 line-clamp-4 mb-4 prose-notion whitespace-pre-wrap">
            {doc.content ? doc.content.replace(/<[^>]*>?/gm, " ") : "No content available"}
          </div>
          <div className="flex items-center justify-between mt-auto pt-3 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FiClock className="h-3 w-3" />
              {format(new Date(doc.updatedAt), "MMM dd, yyyy")}
            </div>
            <div className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full">
              {doc.User?.name || "System"}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
