"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createCoupon, updateCoupon } from "../_actions/coupon.action";

const clientCouponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.string().min(1, "Value is required"),
  expiryDate: z.string().nullable().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  usageLimit: z.string().optional().or(z.literal("")),
  userLimit: z.string().optional().or(z.literal("")),
});

type CouponFormData = z.infer<typeof clientCouponSchema>;

interface CouponFormProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: any | null;
  onSuccess: () => void;
}

export default function CouponForm({ isOpen, onClose, couponToEdit, onSuccess }: CouponFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(clientCouponSchema),
    defaultValues: {
      code: "",
      discountType: "PERCENTAGE",
      value: "0",
      expiryDate: "",
      status: "ACTIVE",
      usageLimit: "",
      userLimit: "",
    },
  });

  const selectedDiscountType = watch("discountType");
  const selectedStatus = watch("status");

  useEffect(() => {
    if (couponToEdit) {
      reset({
        code: couponToEdit.code,
        discountType: couponToEdit.discountType,
        value: couponToEdit.value?.toString() || "0",
        expiryDate: couponToEdit.expiryDate ? new Date(couponToEdit.expiryDate).toISOString().split("T")[0] : "",
        status: couponToEdit.status,
        usageLimit: couponToEdit.usageLimit?.toString() || "",
        userLimit: couponToEdit.userLimit?.toString() || "",
      });
    } else {
      reset({
        code: "",
        discountType: "PERCENTAGE",
        value: "0",
        expiryDate: "",
        status: "ACTIVE",
        usageLimit: "",
        userLimit: "",
      });
    }
  }, [couponToEdit, isOpen, reset]);

  const onSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        code: data.code,
        discountType: data.discountType,
        value: parseFloat(data.value),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit, 10) : null,
        userLimit: data.userLimit ? parseInt(data.userLimit, 10) : null,
      };

      let res;
      if (couponToEdit) {
        res = await updateCoupon(couponToEdit.id, payload);
      } else {
        res = await createCoupon(payload);
      }

      if (res.success) {
        toast({
          title: "Success",
          description: couponToEdit ? "Coupon updated successfully" : "Coupon created successfully",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Error",
          description: res.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process form",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{couponToEdit ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="code">Coupon Code</Label>
            <Input
              id="code"
              placeholder="e.g. SUMMER50"
              {...register("code")}
              className={errors.code ? "border-red-500" : ""}
            />
            {errors.code && (
              <p className="text-xs text-red-500">{errors.code.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type</Label>
              <Select
                value={selectedDiscountType}
                onValueChange={(val: any) => setValue("discountType", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Discount Value</Label>
              <Input
                id="value"
                type="number"
                step="any"
                placeholder={selectedDiscountType === "PERCENTAGE" ? "10" : "100"}
                {...register("value")}
                className={errors.value ? "border-red-500" : ""}
              />
              {errors.value && (
                <p className="text-xs text-red-500">{errors.value.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                {...register("expiryDate")}
                className={errors.expiryDate ? "border-red-500" : ""}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-500">{errors.expiryDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val: any) => setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Total Usage Limit (Optional)</Label>
              <Input
                id="usageLimit"
                type="number"
                placeholder="Unlimited"
                {...register("usageLimit")}
                className={errors.usageLimit ? "border-red-500" : ""}
              />
              {errors.usageLimit && (
                <p className="text-xs text-red-500">{errors.usageLimit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userLimit">Per User Limit (Optional)</Label>
              <Input
                id="userLimit"
                type="number"
                placeholder="Unlimited"
                {...register("userLimit")}
                className={errors.userLimit ? "border-red-500" : ""}
              />
              {errors.userLimit && (
                <p className="text-xs text-red-500">{errors.userLimit.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
