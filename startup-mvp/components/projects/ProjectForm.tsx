"use client";

import { useState, useEffect } from "react";
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
import { FiAlertCircle, FiBriefcase, FiCalendar, FiDollarSign } from "react-icons/fi";
import { createProject, updateProject } from "@/app/actions/projects/project.action";
import { getActiveClients } from "@/app/actions/clients";
import { getActiveUsers } from "@/app/actions/user.action";
import OpportunitySelect from "@/components/quotation/OpportunitySelect";
import OrderSelect from "@/components/projects/OrderSelect";
import { toast } from "sonner";
import { FiUser } from "react-icons/fi";

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().or(z.literal("")),
  clientId: z.string().min(1, "Client is required"),
  opportunityId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  projectManagerId: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export default function ProjectForm({ onSuccess, onCancel, initialData }: ProjectFormProps) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Default dates to today
  const defaultToday = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const result = await getActiveClients();
        if (result.success) {
          setClients(result.clients || []);
        }
      } catch (err) {
        console.error("Fetch clients error:", err);
      } finally {
        setClientsLoading(false);
      }
    };
    
    const fetchUsers = async () => {
        try {
            const res = await getActiveUsers();
            if (res.success) {
                setUsers(res.users || []);
            }
        } catch(e) { console.error(e) } finally { setUsersLoading(false) }
    }
    
    fetchClients();
    fetchUsers();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      clientId: initialData?.clientId || "",
      opportunityId: initialData?.opportunityId || null,
      orderId: initialData?.orderId || null,
      projectManagerId: initialData?.projectManagerId || null,
      startDate: initialData?.startDate ? (typeof initialData.startDate === 'string' ? initialData.startDate.split('T')[0] : new Date(initialData.startDate).toISOString().split('T')[0]) : defaultToday,
      endDate: initialData?.endDate ? (typeof initialData.endDate === 'string' ? initialData.endDate.split('T')[0] : new Date(initialData.endDate).toISOString().split('T')[0]) : defaultToday,
      budget: initialData?.budget ? Number(initialData.budget) : 0,
      priority: initialData?.priority || "NORMAL",
    },
  });

  const selectedOppId = watch("opportunityId");

  const handleOppChange = (opp: any) => {
    if (opp && typeof opp === "object") {
        setValue("opportunityId", opp.id);
        setValue("clientId", opp.clientId);
        if (!watch("title")) setValue("title", opp.title);
    } else {
        setValue("opportunityId", opp); // Could be null or ID
    }
  };

  const selectedOrderId = watch("orderId");
  const handleOrderChange = (order: any) => {
      if (order && typeof order === "object") {
          setValue("orderId", order.id);
          setValue("clientId", order.clientId);
          
          if (order.Quotation && order.Quotation.opportunityId) {
             setValue("opportunityId", order.Quotation.opportunityId);
          }
          
          // Use order number in title if blank
          if (!watch("title")) setValue("title", `Project - ${order.orderNumber}`);
      } else {
          setValue("orderId", order); 
      }
  };

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setLoading(true);
      setError("");

      const payload = {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          opportunityId: data.opportunityId || undefined,
          orderId: data.orderId || undefined,
          projectManagerId: data.projectManagerId || undefined,
      };

      let result;
      if (initialData?.id) {
        result = await updateProject(initialData.id, payload);
      } else {
        result = await createProject(payload);
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save project");
      }

      toast.success(initialData?.id ? "Project updated" : "Project launched");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast.error(err.message || "Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2 pb-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                <FiBriefcase className="h-4 w-4 text-primary" />
                Project Title *
            </Label>
            <Input 
                id="title" 
                {...register("title")} 
                disabled={loading} 
                placeholder="e.g. Website Redesign 2024"
                className="bg-muted/30 focus-visible:ring-primary"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Textarea 
                id="description" 
                {...register("description")} 
                disabled={loading} 
                rows={3} 
                placeholder="Briefly describe the project goals..."
                className="bg-muted/30 resize-none focus-visible:ring-primary"
            />
        </div>
      </div>

      {/* Links & Relations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-border/50 py-4 my-2">
          
          <div className="space-y-2">
             <OrderSelect 
                value={selectedOrderId || undefined}
                onValueChange={handleOrderChange}
                disabled={loading}
              />
          </div>
          
          <div className="space-y-2">
              <Label className="text-sm font-semibold">Client *</Label>
              <Select 
                value={watch("clientId")} 
                onValueChange={(val) => setValue("clientId", val)}
                disabled={loading || clientsLoading || !!selectedOrderId}
              >
                  <SelectTrigger className="bg-muted/30 h-10">
                      <SelectValue placeholder={clientsLoading ? "Loading..." : "Select Client"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                      {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>

          <div className="space-y-2">
              <OpportunitySelect 
                value={selectedOppId || undefined}
                onValueChange={handleOppChange}
                disabled={loading || !!selectedOrderId}
              />
          </div>
          
          <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <FiUser className="h-4 w-4" />
                  Project Manager
              </Label>
              <Select 
                value={watch("projectManagerId") || undefined} 
                onValueChange={(val) => setValue("projectManagerId", val === "none" ? null : val)}
                disabled={loading || usersLoading}
              >
                  <SelectTrigger className="bg-muted/30 h-10">
                      <SelectValue placeholder={usersLoading ? "Loading..." : "Unassigned"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          
      </div>

      {/* Financials & Planning */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-semibold flex items-center gap-2">
                <FiDollarSign className="h-4 w-4 text-emerald-500" />
                Budget
            </Label>
            <Input 
                id="budget" 
                type="number"
                {...register("budget", { valueAsNumber: true })} 
                disabled={loading} 
                className="bg-muted/30"
            />
        </div>
        <div className="space-y-2">
            <Label className="text-sm font-semibold">Priority</Label>
            <Select 
                onValueChange={(v) => setValue("priority", v as any)} 
                defaultValue={watch("priority")}
                disabled={loading}
            >
                <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-semibold flex items-center gap-2">
                <FiCalendar className="h-4 w-4 text-blue-500" />
                Start Date
            </Label>
            <Input 
                id="startDate" 
                type="date"
                {...register("startDate")} 
                disabled={loading} 
                className="bg-muted/30"
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-semibold flex items-center gap-2">
                <FiCalendar className="h-4 w-4 text-orange-500" />
                End Date
            </Label>
            <Input 
                id="endDate" 
                type="date"
                {...register("endDate")} 
                disabled={loading} 
                className="bg-muted/30"
            />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-24">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-36 bg-primary hover:bg-primary/90">
          {loading ? "Saving..." : initialData?.id ? "Update Project" : "Launch Project"}
        </Button>
      </div>
    </form>
  );
}
