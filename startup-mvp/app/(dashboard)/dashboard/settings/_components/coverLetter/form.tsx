"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCoverLetter, updateCoverLetter } from "../../_actions/coverLetter.action";
import { useToast } from "@/hooks/use-toast";

const coverLetterFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["active", "inactive"]),
});

type CoverLetterFormData = z.infer<typeof coverLetterFormSchema>;

interface CoverLetterFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    content: string;
    status: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CoverLetterForm({ mode, initialData, onSuccess, onCancel }: CoverLetterFormProps) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CoverLetterFormData>({
    resolver: zodResolver(coverLetterFormSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          content: initialData.content,
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          title: "",
          content: "",
          status: "active",
        },
  });

  const status = watch("status");

  const onSubmit = async (data: CoverLetterFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createCoverLetter({
          title: data.title,
          content: data.content,
          status: data.status,
        });
      } else {
        if (!initialData?.id) {
          setError("Cover letter ID is required for editing");
          setLoading(false);
          return;
        }
        result = await updateCoverLetter(initialData.id, {
          title: data.title,
          content: data.content,
          status: data.status,
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Cover letter ${mode === "create" ? "created" : "updated"} successfully`,
        });
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || `Failed to ${mode} cover letter`);
        toast({
          title: "Error",
          description: result.error || `Failed to ${mode} cover letter`,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${mode} cover letter`;
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="title" className="mb-2">Title *</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="Cover letter title"
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="content" className="mb-2">Content *</Label>
        <Textarea
          id="content"
          {...register("content")}
          placeholder="Cover letter content..."
          rows={10}
          className={errors.content ? "border-destructive" : ""}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="status" className="mb-2">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue("status", value as "active" | "inactive")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </Button>
      </div>
    </form>
  );
}

