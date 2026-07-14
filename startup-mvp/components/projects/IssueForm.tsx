"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { FiAlertCircle, FiUser, FiInfo, FiActivity, FiTarget } from "react-icons/fi";
import { createIssue, updateIssue } from "@/app/actions/projects/project.action";
import { getActiveUsers } from "@/app/actions/user.action";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const issueSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  type: z.enum(["TASK", "BUG", "FEATURE", "IMPROVEMENT"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"]),
  assigneeId: z.string().optional().nullable(),
  milestoneId: z.string().min(1, "Milestone is required"),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface IssueFormProps {
  milestones?: any[];
  defaultMilestoneId?: string;
  milestoneId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export default function IssueForm({ milestones = [], defaultMilestoneId, milestoneId, onSuccess, onCancel, initialData }: IssueFormProps) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
        const result = await getActiveUsers();
        if (result.success) {
            setUsers(result.users || []);
        }
    };
    fetchUsers();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      description: initialData.description || "",
      priority: initialData.priority || "NORMAL",
      type: initialData.type || "TASK",
      status: initialData.status || "OPEN",
      assigneeId: initialData.assigneeId || null,
      milestoneId: initialData.milestoneId || defaultMilestoneId || milestoneId || "",
    } : {
      priority: "NORMAL",
      type: "TASK",
      status: "OPEN",
      milestoneId: defaultMilestoneId || milestoneId || "",
    },
  });

  const onSubmit = async (data: IssueFormData) => {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        type: data.type,
        status: data.status,
        milestoneId: data.milestoneId,
        assigneeId: (data.assigneeId === "none" || !data.assigneeId) ? undefined : data.assigneeId,
      };

      const result = initialData 
        ? await updateIssue(initialData.id, payload)
        : await createIssue(payload);

      if (result.success) {
        toast.success(initialData ? "Issue updated" : "Technical mission logged");
        onSuccess();
      } else {
        toast.error(result.error || "Operation failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const status = watch("status");
  const priority = watch("priority");
  const type = watch("type");
  const selectedMilestoneId = watch("milestoneId");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Issue Overview</Label>
          <div className="relative group">
            <FiInfo className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="title"
              placeholder="e.g. Memory Leak in Production"
              className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all"
              {...register("title")}
            />
          </div>
          {errors.title && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider ml-1">{errors.title.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mission Specs</Label>
          <Textarea
            id="description"
            placeholder="Detailed report of the core issue and technical constraints..."
            className="min-h-[100px] bg-muted/20 border-border/40 rounded-xl font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            {...register("description")}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Milestone</Label>
          <div className="relative group">
            <FiTarget className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Select
              onValueChange={(value) => setValue("milestoneId", value)}
              defaultValue={selectedMilestoneId || undefined}
            >
              <SelectTrigger className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold">
                <SelectValue placeholder="Select Milestone" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {milestones.map(m => (
                  <SelectItem key={m.id} value={m.id} className="font-bold">{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.milestoneId && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider ml-1">{errors.milestoneId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Object Type</Label>
                <div className="relative group">
                    <FiActivity className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("type", value as any)}
                        defaultValue={type}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="TASK" className="font-bold">TASK</SelectItem>
                            <SelectItem value="BUG" className="font-bold text-rose-500">BUG</SelectItem>
                            <SelectItem value="FEATURE" className="font-bold text-emerald-500">FEATURE</SelectItem>
                            <SelectItem value="IMPROVEMENT" className="font-bold text-primary">REFINEMENT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Threat Level</Label>
                <div className="relative group">
                    <FiAlertCircle className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("priority", value as any)}
                        defaultValue={priority}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="LOW" className="font-bold text-muted-foreground/60">LOW</SelectItem>
                            <SelectItem value="NORMAL" className="font-bold">NORMAL</SelectItem>
                            <SelectItem value="HIGH" className="font-bold text-amber-500">HIGH</SelectItem>
                            <SelectItem value="CRITICAL" className="font-bold text-rose-600">CRITICAL</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Origin</Label>
                <div className="relative group">
                    <FiUser className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("assigneeId", value)}
                        defaultValue={watch("assigneeId") || "none"}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="none" className="font-bold text-muted-foreground/60 italic font-medium">Unassigned</SelectItem>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id} className="font-bold">{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mission Status</Label>
                <Select
                    onValueChange={(value) => setValue("status", value as any)}
                    defaultValue={status}
                >
                    <SelectTrigger className="h-12 bg-muted/20 border-border/40 rounded-xl font-bold">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="OPEN" className="font-bold">OPEN</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="font-bold text-primary">IN PROGRESS</SelectItem>
                        <SelectItem value="CLOSED" className="font-bold text-emerald-500">RESOLVED</SelectItem>
                        <SelectItem value="REJECTED" className="font-bold text-rose-500">REJECTED</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted transition-all"
        >
          Abort
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-primary shadow-xl shadow-primary/20 transition-all active:scale-95"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Syncing..." : initialData ? "Update Mission" : "Commit Issue"}
        </Button>
      </div>
    </form>
  );
}
