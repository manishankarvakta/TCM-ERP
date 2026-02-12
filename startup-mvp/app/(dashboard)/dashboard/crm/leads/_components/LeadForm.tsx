"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FiAlertCircle } from "react-icons/fi";
import { createLead } from "@/app/actions/crm/lead.action";
import { type LeadStatus } from "@prisma/client";

const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any; // To be typed if needed
}

export default function LeadForm({ onSuccess, onCancel, initialData }: LeadFormProps) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Initialize form with split name if initialData provided
  const getInitialValues = () => {
    if (!initialData) return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      source: "",
      notes: "",
    };

    const nameParts = (initialData.name || "").split(" ");
    return {
      ...initialData,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
    };
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: getInitialValues(),
  });

  const onSubmit = async (data: LeadFormData) => {
    try {
      setLoading(true);
      setError("");

      const { firstName, lastName, ...rest } = data;
      const result = await createLead({
        ...rest,
        name: `${firstName} ${lastName}`.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save lead");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...register("firstName")} disabled={loading} placeholder="Jane" />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} disabled={loading} placeholder="Doe" />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" {...register("email")} disabled={loading} placeholder="jane.doe@example.com" />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} disabled={loading} placeholder="+1 234 567 890" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" {...register("company")} disabled={loading} placeholder="Acme Corp" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Source</Label>
        <Input id="source" {...register("source")} disabled={loading} placeholder="Website, Referral, etc." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} disabled={loading} rows={3} placeholder="Additional information..." />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}
