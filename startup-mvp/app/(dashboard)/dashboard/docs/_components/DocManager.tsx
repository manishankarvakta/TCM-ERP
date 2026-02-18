"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiRefreshCcw } from "react-icons/fi";
import { getDocs, deleteDoc } from "@/app/actions/system/doc.action";
import { toast } from "sonner";
import { DocList } from "./DocList";
import { DocForm } from "./DocForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Define types for DocItem
interface DocItem {
  id: string;
  title: string;
  content: string;
}

export default function DocManager() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);

  const fetchData = () => {
    startTransition(async () => {
      const res = await getDocs();
      if (res.success) setDocs(res.docs || []);
      else toast.error(res.error || "Failed to load documents");
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    startTransition(async () => {
      const result = await deleteDoc(id);
      if (result.success) {
        toast.success("Document deleted");
        fetchData();
      } else {
        toast.error(result.error || "Failed to delete document");
      }
    });
  };

  const handleSuccess = () => {
    setIsDrawerOpen(false);
    setEditingDoc(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Docs</h2>
          <p className="text-muted-foreground">
            Manage your internal documentation and knowledge base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isPending}>
            <FiRefreshCcw className={isPending ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => { setEditingDoc(null); setIsDrawerOpen(true); }} className="gap-2">
            <FiPlus /> New Document
          </Button>
        </div>
      </div>

      <DocList 
        docs={docs} 
        onDelete={handleDelete}
        onEdit={(doc: any) => { setEditingDoc(doc); setIsDrawerOpen(true); }}
      />

      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Document" : "New Document"}</DialogTitle>
            <DialogDescription>
              {editingDoc ? "Update document content." : "Create internal documentation."}
            </DialogDescription>
          </DialogHeader>
          <DocForm 
            onSuccess={handleSuccess}
            onCancel={() => setIsDrawerOpen(false)}
            initialData={editingDoc}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
