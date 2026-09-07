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
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiRefreshCw,
  FiTrendingUp,
} from "react-icons/fi";
import { createChannelSpecificCampaignAction } from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

export default function CreatePhysicalCampaignView() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    venueType: "Event / Exhibition",
    location: "",
    vendorContractor: "",
    objective: "",
    budget: "",
    spend: "",
    leads: "",
    conversions: "",
    status: "Active",
    startDate: "",
    endDate: "",
  });

  const budgetNum = Number(formData.budget) || 0;
  const spendNum = Number(formData.spend) || 0;
  const leadsNum = Number(formData.leads) || 0;
  const conversionsNum = Number(formData.conversions) || 0;

  const costPerLead = leadsNum > 0 ? `৳${Math.round(spendNum / leadsNum).toLocaleString()}` : "—";
  const conversionRate = leadsNum > 0 ? `${((conversionsNum / leadsNum) * 100).toFixed(1)}%` : "0.0%";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "PHYSICAL",
        name: formData.name,
        venueType: formData.venueType,
        location: formData.location,
        objective: formData.objective,
        budget: budgetNum,
        spend: spendNum,
        leads: leadsNum,
        conversions: conversionsNum,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      if (res.success) {
        toast.success(`Physical Campaign "${formData.name}" created successfully!`);
        router.push("/dashboard/marketing/physical-campaign");
      } else {
        toast.error(res.error || "Failed to create campaign");
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
          <Link href="/dashboard/marketing/physical-campaign">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Physical Campaigns
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
          Offline & Event Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiBriefcase className="h-7 w-7 text-amber-500" />
          Create New Physical & Offline Campaign
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Record trade show expo booths, outdoor expressway billboards, corporate seminars, and flyer distribution drives.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLS: MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiBriefcase className="h-4 w-4 text-amber-500" />
                  Campaign Identification & Venue
                </CardTitle>
                <CardDescription className="text-xs">
                  Event type, physical location, and vendor management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Title *</Label>
                  <Input
                    required
                    placeholder="e.g. Bangladesh Tech Expo 2026 Executive Pavilion"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Type *</Label>
                    <Select
                      value={formData.venueType}
                      onValueChange={(val) => setFormData({ ...formData, venueType: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Event / Exhibition">Event / Exhibition Booth</SelectItem>
                        <SelectItem value="Outdoor Billboard">Outdoor Billboard / Unipole</SelectItem>
                        <SelectItem value="Print / Direct Mail">Print / Flyer Distribution</SelectItem>
                        <SelectItem value="Corporate Seminar">Corporate Seminar / Roadshow</SelectItem>
                        <SelectItem value="Transit / Bus Branding">Transit / Vehicle Branding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Venue / Physical Location *</Label>
                    <Input
                      required
                      placeholder="e.g. ICC BASHUNDHARA (Hall 4), Dhaka"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Vendor / Contractor Agency</Label>
                    <Input
                      placeholder="e.g. MediaVision Outdoor Advertising Ltd."
                      value={formData.vendorContractor}
                      onChange={(e) => setFormData({ ...formData, vendorContractor: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active / On-Site</SelectItem>
                        <SelectItem value="PLANNING">Planning / In Booking</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Objective & Logistics Brief</Label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Capture 100+ qualified B2B enterprise leads via QR registration and live booth demonstrations..."
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiDollarSign className="h-4 w-4 text-emerald-500" />
                  Budget, Spend & Duration
                </CardTitle>
                <CardDescription className="text-xs">
                  Offline campaign financing and schedule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Allocated Budget (৳) *</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      placeholder="150000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Actual Spend to Date (৳)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="142000"
                      value={formData.spend}
                      onChange={(e) => setFormData({ ...formData, spend: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-blue-500" />
                  Lead Targets & Deals Closed
                </CardTitle>
                <CardDescription className="text-xs">
                  Booth registrations, QR scans, and conversion telemetry
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Offline Leads Captured</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="120"
                      value={formData.leads}
                      onChange={(e) => setFormData({ ...formData, leads: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Closed Deals / Conversions</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="15"
                      value={formData.conversions}
                      onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT 1 COL: ROI FORECAST & SUBMISSION */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiTrendingUp className="h-4 w-4 text-amber-500" />
                  Offline ROI & Performance
                </CardTitle>
                <CardDescription className="text-xs">
                  Computed offline acquisition unit economics
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiMapPin className="h-3.5 w-3.5 text-purple-500" /> Venue Type
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{formData.venueType}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiDollarSign className="h-3.5 w-3.5 text-amber-500" /> Cost Per Lead
                    </span>
                    <span className="font-mono font-bold text-amber-500 text-sm">{costPerLead}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Conversion Rate
                    </span>
                    <span className="font-mono font-bold text-emerald-500 text-sm">{conversionRate}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5 text-amber-500" />
                    Central CRM Ledger Sync
                  </div>
                  <p>
                    All offline and event leads collected will be attributed to this campaign in your central CRM pipeline.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiCheckCircle className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Saving Campaign..." : "Save Physical Campaign"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full h-9 text-xs"
                  >
                    <Link href="/dashboard/marketing/physical-campaign">
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
