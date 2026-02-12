"use client";

import { useState } from "react";
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
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiAlertCircle } from "react-icons/fi";
import { createActivity, updateActivity } from "@/app/actions/crm/activity.action";
import { toast } from "sonner";
import { format } from "date-fns";

const activitySchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  type: z.enum(["call", "meeting", "email", "note", "task"]),
  description: z.string().optional(),
  dueDate: z.string().optional(), // We'll handle date conversion
  contactId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  opportunityId: z.string().optional().nullable(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  contacts?: { id: string; name: string | null; email: string | null }[];
  leads?: { id: string; name: string }[];
  opportunities?: { id: string; title: string }[];
}

export default function ActivityForm({ 
  onSuccess, 
  onCancel, 
  initialData,
  contacts = [],
  leads = [],
  opportunities = [] 
}: ActivityFormProps) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Helper to format date for input type="datetime-local"
  const formatDateForInput = (date?: Date | string) => {
    if (!date) return "";
    try {
        const d = new Date(date);
        return format(d, "yyyy-MM-dd'T'HH:mm");
    } catch (e) {
        return "";
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      subject: initialData?.subject || "",
      type: initialData?.type || "call",
      description: initialData?.description || "",
      dueDate: formatDateForInput(initialData?.dueDate),
      contactId: initialData?.contactId || null,
      leadId: initialData?.leadId || null,
      opportunityId: initialData?.opportunityId || null,
    },
  });

  const onSubmit = async (data: ActivityFormData) => {
    try {
      setLoading(true);
      setError("");

      const payload = {
        ...data,
        contactId: data.contactId || undefined,
        leadId: data.leadId || undefined,
        opportunityId: data.opportunityId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      let result;
      if (initialData?.id) {
        result = await updateActivity(initialData.id, payload);
      } else {
        result = await createActivity(payload);
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save activity");
      }

      toast.success(initialData ? "Activity updated" : "Activity created");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Extract options for SearchableSelect
  const contactOptions = contacts.map(c => ({
    label: c.name || c.email || "Unknown",
    value: c.id,
    description: c.email || undefined
  }));

  const leadOptions = leads.map(l => ({
    label: l.name,
    value: l.id
  }));

  const opportunityOptions = opportunities.map(o => ({
    label: o.title,
    value: o.id
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input id="subject" {...register("subject")} disabled={loading} placeholder="Call with client..." />
        {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-2">
            <Label>Type *</Label>
            <Select 
                onValueChange={(val: any) => setValue("type", val)} 
                defaultValue={watch("type")}
                disabled={loading}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input 
                id="dueDate" 
                type="datetime-local" 
                {...register("dueDate")} 
                disabled={loading} 
            />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
            id="description" 
            {...register("description")} 
            disabled={loading} 
            placeholder="Details about the activity..." 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          {/* Related Contact */}
          <div className="space-y-2">
              <Label>Related Contact</Label>
              <SearchableSelect
                options={contactOptions}
                value={watch("contactId")}
                onValueChange={(val) => setValue("contactId", val)}
                placeholder="Select contact..."
                searchPlaceholder="Search contacts..."
                disabled={loading}
                allowClear
              />
          </div>

          {/* Related Lead */}
          <div className="space-y-2">
              <Label>Related Lead</Label>
              <SearchableSelect
                options={leadOptions}
                value={watch("leadId")}
                onValueChange={(val) => setValue("leadId", val)}
                placeholder="Select lead..."
                searchPlaceholder="Search leads..."
                disabled={loading}
                allowClear
              />
          </div>

          {/* Related Opportunity */}
          <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>Related Opportunity</Label>
              <SearchableSelect
                options={opportunityOptions}
                value={watch("opportunityId")}
                onValueChange={(val) => setValue("opportunityId", val)}
                placeholder="Select opportunity..."
                searchPlaceholder="Search opportunities..."
                disabled={loading}
                allowClear
              />
          </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Activity" : "Create Activity"}
        </Button>
      </div>
    </form>
  );
}
