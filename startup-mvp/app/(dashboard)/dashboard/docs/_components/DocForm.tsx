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
import { createDoc, updateDoc } from "@/app/actions/system/doc.action";
import { toast } from "sonner";
import { FiLoader } from "react-icons/fi";

const docSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
});

interface DocFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function DocForm({ onSuccess, onCancel, initialData }: DocFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof docSchema>>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const onSubmit = (values: z.infer<typeof docSchema>) => {
    startTransition(async () => {
      let result;
      if (initialData) {
        result = await updateDoc(initialData.id, values);
      } else {
        result = await createDoc(values);
      }

      if (result.success) {
        toast.success(initialData ? "Document updated" : "Document created");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save document");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-bold">Document Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter document title (e.g. Deployment Guide)..." className="text-xl h-12" {...field} />
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
              <FormLabel>Body Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Supports markdown and plain text. Write comprehensive documentation here..." 
                  className="min-h-[400px] resize-y font-mono text-sm p-4" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Discard
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="min-w-[150px]">
            {isPending && <FiLoader className="mr-2 animate-spin" />}
            {initialData ? "Save Changes" : "Publish Document"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
