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
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import { createNote, updateNote } from "@/app/actions/system/note.action";
import { toast } from "sonner";
import { FiLoader } from "react-icons/fi";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
});

interface NoteFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function NoteForm({ onSuccess, onCancel, initialData }: NoteFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const onSubmit = (values: z.infer<typeof noteSchema>) => {
    startTransition(async () => {
      const res = initialData 
        ? await updateNote(initialData.id, values)
        : await createNote(values);

      if (res.success) {
        toast.success(initialData ? "Note updated" : "Note created");
        onSuccess();
      } else {
        toast.error(res.error || "Something went wrong");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter note title..." {...field} />
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
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write your note here..." 
                  className="min-h-[200px] resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <FiLoader className="mr-2 animate-spin" />}
            {initialData ? "Update Note" : "Create Note"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
