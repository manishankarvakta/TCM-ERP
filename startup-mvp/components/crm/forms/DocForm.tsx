"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DocFormProps {
  doc?: any;
  entityType: string;
  entityId: string;
  onSuccess: () => void;
}

export function DocForm({ doc, entityType, entityId, onSuccess }: DocFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: doc?.title || "",
    content: doc?.content || "",
    type: doc?.type || "general",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setLoading(true);

    try {
      const { createDoc, updateDoc } = await import("@/app/actions/system/doc.action");

      const docData = {
        ...formData,
        entityType,
        entityId,
      };

      const result = doc?.id
        ? await updateDoc(doc.id, docData)
        : await createDoc(docData);

      if (result.success) {
        toast.success(doc?.id ? "Document updated successfully" : "Document created successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save document");
      }
    } catch (error) {
      console.error("Doc form error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc?.id) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    setLoading(true);
    try {
      const { deleteDoc } = await import("@/app/actions/system/doc.action");
      const result = await deleteDoc(doc.id);

      if (result.success) {
        toast.success("Document deleted successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Delete doc error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter document title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Document Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Enter document content..."
          rows={12}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : doc?.id ? "Update Document" : "Create Document"}
        </Button>
        {doc?.id && (
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
