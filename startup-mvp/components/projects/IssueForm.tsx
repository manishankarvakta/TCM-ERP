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
import { createIssue, updateIssue, getProjectTeam } from "@/app/actions/projects/project.action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const issueSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  type: z.enum(["TASK", "BUG", "FEATURE", "IMPROVEMENT"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"]),
  assigneeId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable().or(z.literal("")),
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
  const params = useParams();
  const projectId = params?.id as string;

  useEffect(() => {
    const fetchUsers = async () => {
        if (!projectId) return;
        const result = await getProjectTeam(projectId);
        if (result.success) {
            setUsers(result.users || []);
        }
    };
    fetchUsers();
  }, [projectId]);

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
      milestoneId: initialData.milestoneId || defaultMilestoneId || milestoneId || "none",
    } : {
      priority: "NORMAL",
      type: "TASK",
      status: "OPEN",
      milestoneId: defaultMilestoneId || milestoneId || "none",
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
        milestoneId: (data.milestoneId === "none" || !data.milestoneId) ? undefined : data.milestoneId,
        projectId: projectId || undefined,
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
          <Label htmlFor="title" className="text-xs font-bold text-muted-foreground ml-1">Title</Label>
          <div className="relative group">
            <FiInfo className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors z-10" />
            <Input
              id="title"
              placeholder="e.g. Memory Leak in Production"
              className="pl-11 h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold focus:ring-2 focus:ring-violet-500/20 transition-all"
              {...register("title")}
            />
          </div>
          {errors.title && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider ml-1">{errors.title.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-xs font-bold text-muted-foreground ml-1">Description</Label>
          <Textarea
            id="description"
            placeholder="Detailed report of the core issue and technical constraints..."
            className="min-h-[100px] bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-medium focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
            {...register("description")}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs font-bold text-muted-foreground ml-1">Milestone</Label>
          <div className="relative group">
            <FiTarget className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors z-10" />
            <Select
              onValueChange={(value) => setValue("milestoneId", value)}
              value={selectedMilestoneId || "none"}
            >
              <SelectTrigger className="pl-11 h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-violet-500/20">
                <SelectValue placeholder="Select Milestone (Optional)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none" className="font-bold text-muted-foreground/60 italic font-medium">No Milestone (Backlog)</SelectItem>
                {milestones.map(m => (
                  <SelectItem key={m.id} value={m.id} className="font-bold">{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label className="text-xs font-bold text-muted-foreground ml-1">Type</Label>
                <div className="relative group">
                    <FiActivity className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("type", value as any)}
                        defaultValue={type}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-violet-500/20">
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
                <Label className="text-xs font-bold text-muted-foreground ml-1">Priority</Label>
                <div className="relative group">
                    <FiAlertCircle className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("priority", value as any)}
                        defaultValue={priority}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-violet-500/20">
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
                <Label className="text-xs font-bold text-muted-foreground ml-1">Assignee</Label>
                <div className="relative group">
                    <FiUser className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors z-10" />
                    <Select
                        onValueChange={(value) => setValue("assigneeId", value)}
                        defaultValue={watch("assigneeId") || "none"}
                    >
                        <SelectTrigger className="pl-11 h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-violet-500/20">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="none" className="font-bold text-muted-foreground/60 italic font-medium">
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">?</span>
                                    <span>Unassigned</span>
                                </div>
                            </SelectItem>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id} className="font-bold">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 shrink-0">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                                {user.name?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{user.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label className="text-xs font-bold text-muted-foreground ml-1">Status</Label>
                <Select
                    onValueChange={(value) => setValue("status", value as any)}
                    defaultValue={status}
                >
                    <SelectTrigger className="h-12 bg-background border border-border/60 hover:bg-muted/10 rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-violet-500/20">
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
          className="flex-1 h-11 rounded-xl font-bold text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer transition-all"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-11 rounded-xl font-bold text-xs bg-violet-600 hover:bg-violet-750 text-white shadow-sm hover:shadow active:scale-95 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Syncing..." : initialData ? "Save Changes" : "Log Issue"}
        </Button>
      </div>
    </form>
  );
}
