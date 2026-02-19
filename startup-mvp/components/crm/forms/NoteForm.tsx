"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface NoteFormProps {
  note?: any;
  entityType: string;
  entityId: string;
  onSuccess: () => void;
}

export function NoteForm({ note, entityType, entityId, onSuccess }: NoteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(note?.content || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setLoading(true);

    try {
      const { createNote, updateNote } = await import("@/app/actions/system/note.action");

      const noteData = {
        content,
        entityType,
        entityId,
      };

      const result = note?.id
        ? await updateNote(note.id, noteData)
        : await createNote(noteData);

      if (result.success) {
        toast.success(note?.id ? "Note updated successfully" : "Note created successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save note");
      }
    } catch (error) {
      console.error("Note form error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note?.id) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    setLoading(true);
    try {
      const { deleteNote } = await import("@/app/actions/system/note.action");
      const result = await deleteNote(note.id);

      if (result.success) {
        toast.success("Note deleted successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to delete note");
      }
    } catch (error) {
      console.error("Delete note error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="content">Note Content *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your note..."
          rows={10}
          required
          className="p-4"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : note?.id ? "Update Note" : "Create Note"}
        </Button>
        {note?.id && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
