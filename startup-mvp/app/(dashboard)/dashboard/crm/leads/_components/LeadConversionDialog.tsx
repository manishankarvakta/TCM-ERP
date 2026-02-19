"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiTrendingUp, FiCheckCircle } from "react-icons/fi";
import { convertLead } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";

const conversionSchema = z.object({
  opportunityTitle: z.string().min(1, "Opportunity title is required"),
  opportunityAmount: z.coerce.number().optional(),
  expectedCloseDate: z.string().optional(),
});

type ConversionFormData = z.infer<typeof conversionSchema>;

interface LeadConversionDialogProps {
  leadId: string | null;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadConversionDialog({
  leadId,
  leadName,
  isOpen,
  onClose,
  onSuccess,
}: LeadConversionDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      opportunityTitle: `${leadName} - Project`,
      opportunityAmount: 0,
      expectedCloseDate: "",
    },
  });

  const onSubmit = async (data: ConversionFormData) => {
    if (!leadId) return;

    try {
      setLoading(true);
      const result = await convertLead(leadId, {
        opportunityTitle: data.opportunityTitle,
        opportunityValue: data.opportunityAmount,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Conversion failed");
      }

      toast.success("Lead converted successfully!");
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to convert lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit as any)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiTrendingUp className="text-primary" />
              Convert Lead
            </DialogTitle>
            <DialogDescription>
              Converting <strong>{leadName}</strong> will create a Client, a Primary Contact, and a New Opportunity.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opportunityTitle">Opportunity Title *</Label>
              <Input
                id="opportunityTitle"
                {...register("opportunityTitle")}
                placeholder="e.g. Website Overhaul"
                disabled={loading}
              />
              {errors.opportunityTitle?.message && (
                <p className="text-xs text-destructive">
                  {errors.opportunityTitle.message.toString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opportunityAmount">Est. Amount</Label>
                <Input
                  id="opportunityAmount"
                  type="number"
                  {...register("opportunityAmount")}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  {...register("expectedCloseDate")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? "Converting..." : <><FiCheckCircle /> Confirm Conversion</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
