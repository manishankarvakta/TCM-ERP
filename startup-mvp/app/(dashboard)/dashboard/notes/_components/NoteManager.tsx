"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiRefreshCcw } from "react-icons/fi";
import { getNotes, deleteNote } from "@/app/actions/system/note.action";
import { toast } from "sonner";
import { NoteList } from "./NoteList";
import { NoteForm } from "./NoteForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createNote, updateNote } from "@/app/actions/system/note.action";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define types for Note
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}


export default function NoteManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchData = () => {
    startTransition(async () => {
// @ts-expect-error - Legacy compatibility
      const res = await getNotes(1, 100);
      if (res.success) setNotes(res.notes || []);
      else toast.error(res.error || "Failed to load notes");
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    startTransition(async () => {
      const result = await deleteNote(id);
      if (result.success) {
        toast.success("Note deleted");
        fetchData();
      } else {
        toast.error(result.error || "Failed to delete note");
      }
    });
  };

  const handleSuccess = () => {
    setIsDrawerOpen(false);
    setEditingNote(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notes</h2>
          <p className="text-muted-foreground">
            Quickly jot down your thoughts and snippets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingNote(null); setIsDrawerOpen(true); }} className="gap-2">
            <FiPlus /> New Note
          </Button>
        </div>
      </div>

      <NoteList 
        notes={notes} 
        onDelete={handleDelete}
        onEdit={(note: any) => { setEditingNote(note); setIsDrawerOpen(true); }}
      />

      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
            <DialogDescription>
              {editingNote ? "Update note content." : "Capture your thoughts."}
            </DialogDescription>
          </DialogHeader>
          <NoteForm 
            onSuccess={handleSuccess}
            onCancel={() => setIsDrawerOpen(false)}
            initialData={editingNote}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
