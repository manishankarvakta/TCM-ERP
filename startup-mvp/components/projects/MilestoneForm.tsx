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
import { FiFlag, FiCalendar, FiClock } from "react-icons/fi";
import { createMilestone, updateMilestone } from "@/app/actions/projects/project.action";
import { toast } from "sonner";

const milestoneSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "DELAYED"]),
  order: z.number(),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export default function MilestoneForm({ projectId, onSuccess, onCancel, initialData }: MilestoneFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      description: initialData.description || "",
      startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
      dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "",
      status: initialData.status || "PLANNED",
      order: initialData.order || 0,
    } : {
      startDate: new Date().toISOString().split('T')[0],
      status: "PLANNED",
      order: 0,
    },
  });

  const onSubmit = async (data: MilestoneFormData) => {
    try {
      const payload = {
        ...data,
        projectId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      const result = initialData 
        ? await updateMilestone(initialData.id, payload)
        : await createMilestone(payload);

      if (result.success) {
        toast.success(initialData ? "Phase updated" : "New phase initialized");
        onSuccess();
      } else {
        toast.error(result.error || "Operation failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phase Title</Label>
          <div className="relative group">
            <FiFlag className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="title"
              placeholder="e.g. Initial Architecture"
              className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all"
              {...register("title")}
            />
          </div>
          {errors.title && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider ml-1">{errors.title.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mission Details</Label>
          <Textarea
            id="description"
            placeholder="Define the core objectives for this technical phase..."
            className="min-h-[120px] bg-muted/20 border-border/40 rounded-xl font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="startDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</Label>
            <div className="relative group">
                <FiCalendar className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                id="startDate"
                type="date"
                className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("startDate")}
                />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Date</Label>
            <div className="relative group">
                <FiCalendar className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                id="dueDate"
                type="date"
                className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("dueDate")}
                />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phase Status</Label>
          <div className="relative group">
              <FiClock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
              <Select
                  onValueChange={(value) => setValue("status", value as any)}
                  defaultValue={watch("status")}
              >
                  <SelectTrigger className="pl-11 h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="PLANNED" className="font-bold">PLANNED</SelectItem>
                      <SelectItem value="IN_PROGRESS" className="font-bold text-primary">IN PROGRESS</SelectItem>
                      <SelectItem value="COMPLETED" className="font-bold text-emerald-500">COMPLETED</SelectItem>
                      <SelectItem value="DELAYED" className="font-bold text-rose-500">DELAYED</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </div>

        <div className="grid gap-2">
            <Label htmlFor="order" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mission Priority Order</Label>
            <Input
                id="order"
                type="number"
                placeholder="0"
                className="h-12 bg-muted/20 border-border/40 rounded-xl font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("order", { valueAsNumber: true })}
            />
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter ml-1">Defines the sequence in the project roadmap.</p>
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
          {isSubmitting ? "Syncing..." : initialData ? "Save Changes" : "Create Milestone"}
        </Button>
      </div>
    </form>
  );
}
