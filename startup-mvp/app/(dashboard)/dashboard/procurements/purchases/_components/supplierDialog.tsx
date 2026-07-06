"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { createSupplier } from "../../../suppliers/_actions/supplier.action";

const supplierSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierDialogProps {
  onCreated: (supplier: any) => void;
  onCancel: () => void;
}

export default function SupplierDialog({ onCreated, onCancel }: SupplierDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const res = await createSupplier({
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        company: data.company,
        status: "active",
      });
      
      if (res.success && res.supplier) {
        toast.success("Supplier created successfully");
        onCreated(res.supplier);
        reset();
      } else {
        toast.error(res.error || "Failed to create supplier");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register("name")} placeholder="Supplier Name" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...register("email")} placeholder="supplier@example.com" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" {...register("company")} placeholder="Company Name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input id="phone" {...register("phone")} placeholder="+1 234 567 890" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? "Saving…" : "Save Supplier"}
        </Button>
      </DialogFooter>
    </form>
  );
}
