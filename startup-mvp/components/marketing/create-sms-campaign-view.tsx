"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  FiArrowLeft,
  FiMessageSquare,
  FiSend,
  FiUsers,
  FiRefreshCw,
  FiSmartphone,
} from "react-icons/fi";
import { createChannelSpecificCampaignAction } from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

export default function CreateSmsCampaignView() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    senderGateway: "Grameenphone Masking Gateway",
    senderMask: "",
    audience: "Enterprise Leads & Prospects",
    message: "",
    recipients: "",
    budget: "",
    status: "LAUNCHED",
    startDate: "",
  });

  const charCount = formData.message.length;
  const smsParts = Math.ceil(charCount / 160) || 1;
  const recipientsNum = Number(formData.recipients) || 0;
  const budgetNum = Number(formData.budget) || 0;
  const estimatedCostPerSms = recipientsNum > 0 ? (budgetNum / recipientsNum).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!formData.message.trim()) {
      toast.error("Please enter the SMS message body");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "SMS",
        name: formData.name,
        channel: `SMS (${formData.senderGateway})`,
        message: formData.message,
        budget: budgetNum,
        status: formData.status,
        startDate: formData.startDate,
      });

      if (res.success) {
        toast.success(`SMS Broadcast "${formData.name}" scheduled & saved!`);
        router.push("/dashboard/marketing/sms-campaign");
      } else {
        toast.error(res.error || "Failed to create SMS broadcast");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1200px] mx-auto text-foreground">
      {/* 1. TOP NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/sms-campaign">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to SMS Broadcasts
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5">
          SMS Broadcast Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiMessageSquare className="h-7 w-7 text-rose-500" />
          Dispatch New SMS Broadcast
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Compose broadcast copy, configure telco routes and sender masking, verify live handset preview, and schedule dispatch.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLS: MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiMessageSquare className="h-4 w-4 text-rose-500" />
                  Broadcast Details & Gateway Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure telco carrier masking and broadcast metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Broadcast Title / Campaign Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Q4 Banking Sync ERP Webinar VIP SMS Blast"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Telco Gateway Route *</Label>
                    <Select
                      value={formData.senderGateway}
                      onValueChange={(val) => {
                        const mask = val.includes("Grameenphone") ? "TechCorp GP" : val.includes("Banglalink") ? "TechCorp BL" : "TechCorp CRM";
                        setFormData({ ...formData, senderGateway: val, senderMask: mask });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grameenphone Masking Gateway">Grameenphone Masking (High TPS)</SelectItem>
                        <SelectItem value="Banglalink Gateway Direct">Banglalink Direct Route</SelectItem>
                        <SelectItem value="Robi Axiata Telecom Gateway">Robi Axiata Gateway</SelectItem>
                        <SelectItem value="InfoBip Global SMS Route">InfoBip Global SMS Route</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sender Masking ID</Label>
                    <Input
                      value={formData.senderMask}
                      onChange={(e) => setFormData({ ...formData, senderMask: e.target.value })}
                      placeholder="e.g. TechCorp CRM"
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Message Body *</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {charCount} chars • <strong className="text-rose-500">{smsParts}</strong> SMS {smsParts > 1 ? "parts" : "part"}
                    </span>
                  </div>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Write your broadcast message here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="text-xs resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Standard GSM 7-bit character limit is 160 characters for 1 SMS part. Multi-part messages are automatically concatenated.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-blue-500" />
                  Audience Targeting & Delivery Budget
                </CardTitle>
                <CardDescription className="text-xs">
                  Specify target numbers, dispatch schedule and telco budget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Audience Segment</Label>
                    <Select
                      value={formData.audience}
                      onValueChange={(val) => setFormData({ ...formData, audience: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enterprise Leads & Prospects">Enterprise Leads (500)</SelectItem>
                        <SelectItem value="High-Intent Inquiries">High-Intent Inquiries (350)</SelectItem>
                        <SelectItem value="Existing ERP Client Contacts">Active Clients (1,200)</SelectItem>
                        <SelectItem value="Webinar Registered Attendees">Webinar Attendees (450)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Recipients Count *</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      placeholder="500"
                      value={formData.recipients}
                      onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estimated Budget (৳) *</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      placeholder="2500"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-rose-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Dispatch Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LAUNCHED">Send Immediately / Active</SelectItem>
                        <SelectItem value="PLANNING">Schedule as Draft</SelectItem>
                        <SelectItem value="COMPLETED">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT 1 COL: PHONE SIMULATOR & DISPATCH CTA */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiSmartphone className="h-4 w-4 text-rose-500" />
                  Live Handset Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  Visual simulation on recipient smartphone
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Mobile Phone Mockup */}
                <div className="w-full max-w-[280px] mx-auto rounded-3xl border-4 border-muted-foreground/30 bg-background shadow-lg overflow-hidden p-3 space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 border-b border-border/30 pb-1">
                    <span>9:41 AM</span>
                    <span className="font-semibold text-rose-500">4G LTE</span>
                  </div>

                  <div className="text-center py-1">
                    <div className="text-xs font-bold text-foreground">{formData.senderMask || "TechCorp"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">SMS Broadcast</div>
                  </div>

                  <div className="bg-rose-500/10 border border-rose-500/20 text-foreground p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs">
                    {formData.message || "Your SMS text message will appear here..."}
                    <div className="text-[9px] text-muted-foreground text-right mt-1.5">Now • Delivered</div>
                  </div>
                </div>

                {/* KPI Breakdown */}
                <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-mono font-bold text-foreground">
                      {(recipientsNum * smsParts).toLocaleString()} SMS credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost per Recipient:</span>
                    <span className="font-mono font-bold text-rose-500">৳{estimatedCostPerSms}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiSend className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Dispatching Broadcast..." : "Send SMS Broadcast"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full h-9 text-xs"
                  >
                    <Link href="/dashboard/marketing/sms-campaign">
                      Cancel
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
