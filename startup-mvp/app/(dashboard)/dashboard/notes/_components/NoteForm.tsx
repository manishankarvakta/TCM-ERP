"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { createNote, updateNote, deleteNote } from "@/app/actions/system/note.action";
import { toast } from "sonner";
import { FiLoader, FiCheck, FiTrash2 } from "react-icons/fi";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface Note {
  id: string;
  title: string;
  content: string;
}

interface NoteFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Note | null;
  entityId?: string;
  entityType?: "lead" | "opportunity" | "contact" | "project";
}

export function NoteForm({ onSuccess, onCancel, initialData, entityId, entityType }: NoteFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const onSubmit = (values: NoteFormValues) => {
    startTransition(async () => {
      const data: any = {
        title: values.title,
        content: values.content,
      };

      if (entityId && entityType) {
        data.entityType = entityType;
        data.entityId = entityId;
        if (entityType === "lead") data.leadId = entityId;
        else if (entityType === "opportunity") data.opportunityId = entityId;
        else if (entityType === "contact") data.contactId = entityId;
      }

      const res = initialData 
        ? await updateNote(initialData.id, data)
        : await createNote(data);

      if (res.success) {
        toast.success(initialData ? "Note updated" : "Note created");
        onSuccess();
      } else {
        toast.error(res.error || "Something went wrong");
      }
    });
  };

  const onDelete = () => {
    if (!initialData?.id) return;
    
    if (window.confirm("Are you sure you want to delete this note?")) {
      startTransition(async () => {
        const res = await deleteNote(initialData.id);
        if (res.success) {
          toast.success("Note deleted");
          onSuccess();
        } else {
          toast.error(res.error || "Failed to delete note");
        }
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core Section */}
        <div className="space-y-4"> 
            <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm font-medium">Title</FormLabel>
                <FormControl>
                    <Input placeholder="Note title..." {...field} className="font-medium" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm font-medium">Content</FormLabel>
                <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Write your note here..."
                      className="p-3"
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          {initialData && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onDelete} 
              disabled={isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
            >
              <FiTrash2 className="mr-2" />
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="min-w-[100px]">
            {isPending && <FiLoader className="mr-2 animate-spin" />}
            {initialData ? "Update Note" : "Create Note"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
