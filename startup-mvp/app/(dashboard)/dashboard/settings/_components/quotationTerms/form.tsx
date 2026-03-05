"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createQuotationTerms, updateQuotationTerms } from "../../_actions/quotationTerms.action";
import { Checkbox } from "@/components/ui/checkbox";

interface QuotationTermsFormProps {
  mode?: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    content: string;
    paymentTerms: string;
    refundPolicy: string;
    terminationPolicy: string;
    status: string;
    isDefault: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function QuotationTermsForm({
  mode = "create",
  initialData,
  onSuccess,
  onCancel,
}: QuotationTermsFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || "");
  const [refundPolicy, setRefundPolicy] = useState(initialData?.refundPolicy || "");
  const [terminationPolicy, setTerminationPolicy] = useState(initialData?.terminationPolicy || "");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for these terms.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      let result;
      if (mode === "edit" && initialData) {
        result = await updateQuotationTerms(initialData.id, {
          title,
          content,
          paymentTerms,
          refundPolicy,
          terminationPolicy,
          isDefault,
        });
      } else {
        result = await createQuotationTerms({
          title,
          content,
          paymentTerms,
          refundPolicy,
          terminationPolicy,
          isDefault,
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: mode === "edit" ? "Terms updated successfully" : "Terms created successfully",
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save terms",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Template Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Standard Software Development Terms"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked === true)}
            disabled={isPending}
          />
          <Label htmlFor="isDefault" className="text-sm font-medium leading-none cursor-pointer">
            Set as default terms for new quotations
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Terms and Conditions (TOS)</Label>
          <div className="rounded-md border">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Enter general terms and conditions..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <div className="rounded-md border">
            <RichTextEditor
              value={paymentTerms}
              onChange={setPaymentTerms}
              placeholder="Enter payment schedule and terms..."
              className="min-h-[150px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Refund Policy</Label>
            <div className="rounded-md border">
              <RichTextEditor
                value={refundPolicy}
                onChange={setRefundPolicy}
                placeholder="Enter refund policy..."
                className="min-h-[150px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Termination Policy</Label>
            <div className="rounded-md border">
              <RichTextEditor
                value={terminationPolicy}
                onChange={setTerminationPolicy}
                placeholder="Enter termination terms..."
                className="min-h-[150px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Update Terms" : "Create Terms"}
        </Button>
      </div>
    </form>
  );
}
