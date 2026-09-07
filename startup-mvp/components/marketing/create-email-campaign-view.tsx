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
  FiMail,
  FiSend,
  FiUsers,
  FiCheckCircle,
  FiRefreshCw,
  FiFileText,
} from "react-icons/fi";
import { createChannelSpecificCampaignAction } from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

export default function CreateEmailCampaignView() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    fromName: "",
    fromEmail: "",
    preheader: "",
    audience: "Enterprise Leads (1,450)",
    body: "",
    budget: "",
    status: "SENT",
    startDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      toast.error("Please enter an email subject line");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "EMAIL",
        name: formData.subject,
        subject: formData.subject,
        audience: formData.audience,
        message: `${formData.preheader}\n\n${formData.body}`,
        budget: Number(formData.budget) || 0,
        status: formData.status,
        startDate: formData.startDate,
      });

      if (res.success) {
        toast.success(`Email Broadcast "${formData.subject}" scheduled & saved!`);
        router.push("/dashboard/marketing/email-campaigns");
      } else {
        toast.error(res.error || "Failed to create email broadcast");
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
          <Link href="/dashboard/marketing/email-campaigns">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Email Broadcasts
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
          Email Broadcast Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiMail className="h-7 w-7 text-teal-500" />
          Compose New Email Broadcast
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Draft newsletter copy, configure sender identity, target audience segments, and schedule broadcast delivery.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLS: MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiMail className="h-4 w-4 text-teal-500" />
                  Email Header & Sender Identity
                </CardTitle>
                <CardDescription className="text-xs">
                  Subject line and inbox preview configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject Line *</Label>
                  <Input
                    required
                    placeholder="e.g. August Enterprise ERP Product Newsletter & Release Notes"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Preheader / Snippet Text</Label>
                  <Input
                    placeholder="e.g. Exclusive insights and strategic ERP enhancements for your enterprise"
                    value={formData.preheader}
                    onChange={(e) => setFormData({ ...formData, preheader: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Displayed alongside the subject in modern email inboxes like Gmail & Apple Mail.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sender Name</Label>
                    <Input
                      placeholder="e.g. TechCorp Enterprise Team"
                      value={formData.fromName}
                      onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sender Email</Label>
                    <Input
                      type="email"
                      placeholder="e.g. marketing@techcorp.com"
                      value={formData.fromEmail}
                      onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiFileText className="h-4 w-4 text-teal-500" />
                  Email Body Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Rich text and message content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Message Body</Label>
                  <Textarea
                    rows={8}
                    placeholder="Hello,&#10;&#10;We are excited to share our latest product updates and architectural enhancements for your enterprise workflow. Our modular ERP solutions help reduce operational latency while empowering your finance and management teams with real-time analytics.&#10;&#10;Best regards,&#10;The TechCorp Team"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="text-xs resize-none leading-relaxed font-sans"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-blue-500" />
                  Audience Segmentation & Schedule
                </CardTitle>
                <CardDescription className="text-xs">
                  Select recipient group and dispatch timestamp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Audience Segment *</Label>
                    <Select
                      value={formData.audience}
                      onValueChange={(val) => setFormData({ ...formData, audience: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enterprise Leads (1,450)">Enterprise Leads (1,450)</SelectItem>
                        <SelectItem value="Fintech Decision Makers (820)">Fintech Decision Makers (820)</SelectItem>
                        <SelectItem value="Active Subscribers (2,100)">Active Subscribers (2,100)</SelectItem>
                        <SelectItem value="HR Managers (640)">HR Managers (640)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status / Dispatch Mode</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SENT">Send Immediately</SelectItem>
                        <SelectItem value="SCHEDULED">Schedule for Later</SelectItem>
                        <SelectItem value="PLANNING">Save as Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estimated Budget (৳)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="10000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-teal-500"
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT 1 COL: INBOX PREVIEW & SUBMISSION */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiMail className="h-4 w-4 text-teal-500" />
                  Live Inbox Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  Visual render of the email in recipient client
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Email Client Preview Box */}
                <div className="w-full rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
                  <div className="p-3 bg-muted/40 border-b border-border/40 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground">From: <strong className="text-foreground">{formData.fromName}</strong> &lt;{formData.fromEmail}&gt;</div>
                    <div className="text-xs font-bold text-foreground truncate">{formData.subject || "Your Subject Line"}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{formData.preheader || "Preheader snippet"}</div>
                  </div>

                  <div className="p-4 bg-background/80 text-foreground text-[11px] leading-relaxed whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto">
                    {formData.body}
                  </div>

                  <div className="p-3 bg-muted/30 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Audience: {formData.audience.split(" ")[0]}</span>
                    <span className="text-teal-500 font-semibold">DKIM Verified</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5 text-teal-500" />
                    Deliverability Assurance
                  </div>
                  <p>
                    Automatic SPF, DKIM, and DMARC alignment ensure high inbox placement across all domains.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiSend className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Dispatching Broadcast..." : "Send Email Broadcast"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full h-9 text-xs"
                  >
                    <Link href="/dashboard/marketing/email-campaigns">
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
