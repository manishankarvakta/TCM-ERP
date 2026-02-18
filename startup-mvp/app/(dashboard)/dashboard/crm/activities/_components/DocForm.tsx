"use client";

import { useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FiAlertCircle, FiFileText, FiSave, FiClock, FiCheck, FiUser } from "react-icons/fi";
import { GripVertical, Edit3, Eye } from "lucide-react";
import { createDoc, updateDoc } from "@/app/actions/system/doc.action";
import { toast } from "sonner";
import { SystemEntityType } from "@/lib/system/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DocEditor } from "./DocEditor";

const docSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
});

type DocFormData = z.infer<typeof docSchema>;

interface DocFormProps {
  entityType?: SystemEntityType;
  entityId?: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DocForm({ 
  entityType, 
  entityId, 
  initialData,
  onSuccess, 
  onCancel,
}: DocFormProps) {
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isEditMode, setIsEditMode] = useState(!initialData?.id);
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [content, setContent] = useState(initialData?.content || "");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DocFormData>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const watchTitle = watch("title");
  const watchContent = watch("content");

  // Update form value when editor content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const onSubmit = (data: DocFormData) => {
    setError("");
    
    startTransition(async () => {
      try {
        const payload = {
            ...data,
            content: content, // Use state content from Tiptap
            status,
        };

        if (initialData?.id) {
            const result = await updateDoc(initialData.id, payload);
            if (!result.success) throw new Error(result.error || "Failed to update doc");
            toast.success("Document updated successfully");
        } else {
            const result = await createDoc({
              ...payload,
              entityType: entityType || undefined,
              entityId: entityId || undefined,
            });
            if (!result.success) throw new Error(result.error || "Failed to create doc");
            toast.success("Document created successfully");
        }
  
        onSuccess();
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950/50">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {error && (
          <div className="mx-auto mt-4 w-full max-w-[800px] px-6">
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 dark:bg-destructive/20 p-3 text-sm text-destructive dark:text-red-400 border border-destructive/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-12 scroll-smooth">
          <div className="max-w-[800px] mx-auto space-y-12 bg-white dark:bg-slate-900 p-12 md:p-16 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 min-h-full flex flex-col transition-colors">
            
            {/* Metadata & Premium Header - Unchanged */}
            <div className="space-y-6">
               {/* ... header content ... */}
               <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-1 rounded-full bg-primary/20" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Document Editor</span>
                </div>
                <Badge variant={status === "published" ? "success" : "secondary"} className="h-6 px-3 text-[10px] capitalize font-bold tracking-tight">
                  {status}
                </Badge>
              </div>

              {/* Enhanced Title Section */}
              <div className="space-y-4">
                {isEditMode ? (
                  <Input 
                    {...register("title")} 
                    disabled={isPending} 
                    placeholder="Untitled Document"
                    className="text-5xl md:text-6xl font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-slate-200 dark:placeholder:text-slate-700 tracking-tighter text-slate-900 dark:text-slate-50" 
                  />
                ) : (
                  <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-slate-50 tracking-tighter leading-[1.1]">
                    {watchTitle || "Untitled Document"}
                  </h1>
                )}
                 {/* ... metadata details ... */}
                 <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs font-medium pt-2">
                  {initialData?.User?.name && (
                    <div className="flex items-center gap-1.5">
                      <FiUser className="h-3 w-3" />
                      <span>{initialData.User.name}</span>
                    </div>
                  )}
                  {initialData?.User?.name && <span className="text-slate-200 dark:text-slate-700">|</span>}
                  {initialData && (
                    <div className="flex items-center gap-1.5">
                      <FiClock className="h-3 w-3" />
                      <span>Last updated {format(new Date(initialData.updatedAt), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {entityType && entityId && (
                    <>
                      <span className="text-slate-200 dark:text-slate-700">|</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary/60">Linked to {entityType}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100/60 dark:bg-slate-800/60" />

            {/* Content Section with Toggleable Modes */}
            <div 
              className={cn(
                "flex-1 flex flex-col pt-8 relative group/content",
                !isEditMode && "cursor-default"
              )}
            >
              {isEditMode ? (
                 <DocEditor 
                    content={content} 
                    onChange={handleContentChange} 
                    className="min-h-[500px]"
                 />
              ) : (
                <div 
                    className="prose prose-lg prose-slate dark:prose-invert max-w-none min-h-[500px] prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7"
                    dangerouslySetInnerHTML={{ __html: content || "<p class='text-slate-300 italic'>No content yet...</p>" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Minimal "Floating" Actions Bar - Unchanged */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* ... buttons ... */}
           {initialData?.id && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className={cn(
                "h-9 px-4 gap-2 font-bold transition-all rounded-xl",
                isEditMode ? "bg-primary/5 text-primary hover:bg-primary/10" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {isEditMode ? (
                <>
                  <FiCheck className="h-4 w-4" />
                  Finish Editing
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Edit Document
                </>
              )}
            </Button>
          )}

          {(!initialData?.id || isEditMode) && (
            <>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              
              {initialData?.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatus(status === "published" ? "draft" : "published")}
                  className={cn(
                    "h-9 px-4 gap-2 font-bold transition-all rounded-xl",
                    status === "published" ? "text-success hover:bg-success/10" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {status === "published" ? "Unpublish" : "Publish"}
                </Button>
              )}

              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending} className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} size="sm" className="h-9 px-6 gap-2 font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.05] rounded-xl">
                {isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FiSave className="h-4 w-4" />
                )}
                {initialData?.id ? "Apply Changes" : "Create Document"}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default DocForm;
