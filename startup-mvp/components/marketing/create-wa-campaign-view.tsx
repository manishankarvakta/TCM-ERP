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
  FiCheckCircle,
  FiRefreshCw,
  FiSmartphone,
  FiExternalLink,
} from "react-icons/fi";
import { createChannelSpecificCampaignAction } from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

export default function CreateWaCampaignView() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    templateName: "broadcast_product_launch",
    audience: "Enterprise Leads",
    leadNamePlaceholder: "",
    companyPlaceholder: "",
    message: "",
    budget: "",
    status: "Active",
    startDate: "",
  });

  const templates = [
    {
      id: "broadcast_product_launch",
      name: "broadcast_product_launch",
      category: "MARKETING",
      defaultText: "Hi {{1}}, discover the all-new ERP suite modules designed specifically for {{2}}. Streamline operations, cut overhead by 30%, and boost team productivity. Tap below to schedule an exclusive VIP walkthrough!",
    },
    {
      id: "vip_demo_invitation",
      name: "vip_demo_invitation",
      category: "UTILITY",
      defaultText: "Hello {{1}}, you are cordially invited to our exclusive CXO Executive Demo on Enterprise ERP Solutions. RSVP today!",
    },
    {
      id: "service_reminder_v2",
      name: "service_reminder_v2",
      category: "UTILITY",
      defaultText: "Dear {{1}}, your scheduled consultation session with our technical team is confirmed for tomorrow.",
    },
    {
      id: "quarterly_billing_update",
      name: "quarterly_billing_update",
      category: "UTILITY",
      defaultText: "Hi {{1}}, your Q3 summary statement and analytics report is now ready for review.",
    },
  ];

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = templates.find((t) => t.id === tmplName);
    setFormData((prev) => ({
      ...prev,
      templateName: tmplName,
      message: tmpl ? tmpl.defaultText : prev.message,
    }));
  };

  const previewText = formData.message
    .replace("{{1}}", formData.leadNamePlaceholder || "Recipient")
    .replace("{{2}}", formData.companyPlaceholder || "Company");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "WA",
        name: formData.name,
        templateName: formData.templateName,
        audience: formData.audience,
        message: formData.message,
        budget: Number(formData.budget) || 0,
        status: formData.status,
        startDate: formData.startDate,
      });

      if (res.success) {
        toast.success(`WhatsApp Broadcast "${formData.name}" launched successfully!`);
        router.push("/dashboard/marketing/wa-campaign");
      } else {
        toast.error(res.error || "Failed to launch WhatsApp broadcast");
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
          <Link href="/dashboard/marketing/wa-campaign">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to WhatsApp Campaigns
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
          WhatsApp Business Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiMessageSquare className="h-7 w-7 text-emerald-500" />
          Launch New WhatsApp Broadcast
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select pre-approved Meta HSM templates, populate dynamic personalized placeholders, and schedule bulk delivery.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLS: MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiMessageSquare className="h-4 w-4 text-emerald-500" />
                  Broadcast Setup & HSM Template
                </CardTitle>
                <CardDescription className="text-xs">
                  Official WhatsApp Cloud API templates & targeting configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Broadcast Campaign Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Q4 Garments ERP Product Upgrade Broadcast"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pre-Approved HSM Template *</Label>
                    <Select
                      value={formData.templateName}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        <SelectItem value="Enterprise Leads">Enterprise Leads (1,450)</SelectItem>
                        <SelectItem value="High-Intent Contacts">High-Intent Contacts (680)</SelectItem>
                        <SelectItem value="All Subscribers">All Subscribers (3,200)</SelectItem>
                        <SelectItem value="VIP Client Accounts">VIP Accounts (120)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Variable {'{{1}}'} (Recipient Name)</Label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={formData.leadNamePlaceholder}
                      onChange={(e) => setFormData({ ...formData, leadNamePlaceholder: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Variable {'{{2}}'} (Company / Domain)</Label>
                    <Input
                      placeholder="e.g. Apex Garments Ltd."
                      value={formData.companyPlaceholder}
                      onChange={(e) => setFormData({ ...formData, companyPlaceholder: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Template Message Body</Label>
                  <Textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="text-xs resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Variables in the format {'{{1}}'} and {'{{2}}'} are dynamically substituted per recipient from your CRM contacts.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiSend className="h-4 w-4 text-blue-500" />
                  Delivery Schedule & Budget
                </CardTitle>
                <CardDescription className="text-xs">
                  Execution schedule and WhatsApp Meta conversation cost
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Allocated Budget (৳) *</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      placeholder="5000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Launch / Schedule Date</Label>
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
                        <SelectItem value="Active">Launch Immediately</SelectItem>
                        <SelectItem value="PLANNING">Save Draft</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT 1 COL: WHATSAPP CHAT PREVIEW */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiSmartphone className="h-4 w-4 text-emerald-500" />
                  WhatsApp Chat Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time simulated WhatsApp message
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* WhatsApp Chat UI Mockup */}
                <div className="w-full rounded-2xl border border-emerald-500/30 bg-[#0b141a] text-[#e9edef] p-3 space-y-2.5 shadow-md">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                      TC
                    </div>
                    <div>
                      <div className="text-xs font-semibold">TechCorp Business Verified</div>
                      <div className="text-[10px] text-emerald-400">Official WhatsApp Account</div>
                    </div>
                  </div>

                  <div className="bg-[#005c4b] text-[#e9edef] p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs">
                    <p>{previewText}</p>
                    <div className="text-[9px] text-[#8696a0] text-right mt-1.5">10:30 AM • ✓✓</div>
                  </div>

                  {/* Interactive Button in WhatsApp */}
                  <div className="pt-1">
                    <div className="w-full py-1.5 rounded-lg bg-[#202c33] text-[#00a884] text-center text-xs font-semibold border border-white/5 flex items-center justify-center gap-1">
                      <FiExternalLink className="h-3 w-3" /> Book VIP Demo
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    Meta Cloud API Verified
                  </div>
                  <p>
                    HSM template conforms to WhatsApp messaging guidelines and achieves up to 98% delivery rate.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiSend className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Dispatching Broadcast..." : "Launch WhatsApp Broadcast"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full h-9 text-xs"
                  >
                    <Link href="/dashboard/marketing/wa-campaign">
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
