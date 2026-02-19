"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiEdit2, FiTrash2, FiFileText } from "react-icons/fi";
import { format } from "date-fns";

interface NoteListProps {
  notes: any[];
  onDelete: (id: string) => void;
  onEdit: (note: any) => void;
}

export function NoteList({ notes, onDelete, onEdit }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <FiFileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No notes found</h3>
          <p className="text-muted-foreground">Start by writing your first note.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Card key={note.id} className="p-4 flex flex-col h-full transition-all hover:shadow-md">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold line-clamp-1">{note.title}</h4>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(note)}>
                <FiEdit2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                onClick={() => onDelete(note.id)}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap mb-4">
            {note.content || <em className="text-xs opacity-50">No content</em>}
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t text-[10px] text-muted-foreground">
            <span>{format(new Date(note.createdAt), "MMM dd, yyyy")}</span>
            <span className="truncate max-w-[100px]">{note.User?.name || "System"}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
