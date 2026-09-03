"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiLayers,
  FiPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiEye,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiUser,
  FiX,
  FiTarget,
} from "react-icons/fi";
import { createMarketingCampaign } from "@/app/actions/crm/marketing-operations.action";

export default function CampaignsView() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    campaignType: "DIGITAL_MARKETING",
    stage: "Lead Generation",
    channel: "Meta & Google Ads",
    objective: "Lead Generation for Enterprise ERP",
    startDate: "",
    endDate: "",
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const initialCampaigns = [
    {
      id: "CMP-01",
      name: "Q3 Fintech Lead Generation",
      type: "DIGITAL_MARKETING",
      stage: "Lead Generation",
      channel: "Meta & Google Ads",
      objective: "Lead Generation for Enterprise ERP",
      startDate: "2026-08-01",
      endDate: "2026-09-30",
      status: "ACTIVE",
      budget: "৳1,00,000",
      spent: "৳65,000",
      leads: 54,
      cpl: "৳1,203",
    },
    {
      id: "CMP-02",
      name: "Enterprise ERP Brand Positioning",
      type: "BRANDING",
      stage: "Awareness",
      channel: "LinkedIn & Organic",
      objective: "Brand Positioning & Executive Reach",
      startDate: "2026-08-10",
      endDate: "2026-10-15",
      status: "ACTIVE",
      budget: "৳80,000",
      spent: "৳45,000",
      leads: 28,
      cpl: "৳1,607",
    },
    {
      id: "CMP-03",
      name: "Standard Chartered Co-Op Engagement",
      type: "EMAIL",
      stage: "Engagement",
      channel: "Email Broadcast & SMS",
      objective: "Co-marketing Engagement & Customer Nurturing",
      startDate: "2026-07-15",
      endDate: "2026-08-31",
      status: "ACTIVE",
      budget: "৳50,000",
      spent: "৳35,000",
      leads: 32,
      cpl: "৳1,093",
    },
    {
      id: "CMP-04",
      name: "SaaS Product Feature Launch",
      type: "EVENTS",
      stage: "Conversion",
      channel: "Webinar & Social",
      objective: "New Feature Conversion & Signups",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
      status: "SCHEDULED",
      budget: "৳60,000",
      spent: "৳12,000",
      leads: 10,
      cpl: "৳1,200",
    },
    {
      id: "CMP-05",
      name: "Q2 Client Retention Drive",
      type: "DIGITAL_MARKETING",
      stage: "Retention",
      channel: "Google Display Network",
      objective: "Re-engage Inactive Prospects & Renewal Drive",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      status: "COMPLETED",
      budget: "৳75,000",
      spent: "৳74,500",
      leads: 62,
      cpl: "৳1,201",
    },
  ];

  const [campaignsList, setCampaignsList] = useState(initialCampaigns);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const newCamp = {
      id: `CMP-0${campaignsList.length + 1}`,
      name: formData.name,
      type: formData.campaignType,
      stage: formData.stage,
      channel: formData.channel,
      objective: formData.objective,
      startDate: formData.startDate || "2026-09-01",
      endDate: formData.endDate || "2026-09-30",
      status: "DRAFT",
      budget: "৳50,000",
      spent: "৳0",
      leads: 0,
      cpl: "—",
    };
    setCampaignsList([newCamp, ...campaignsList]);
    setShowCreateModal(false);
    setFormData({ name: "", campaignType: "DIGITAL_MARKETING", stage: "Lead Generation", channel: "Meta & Google Ads", objective: "Lead Generation", startDate: "", endDate: "" });
  };

  const handleTrashCampaign = (id: string) => {
    if (confirm("Move this campaign to Trash?")) {
      setCampaignsList(campaignsList.map(c => c.id === id ? { ...c, status: "CANCELLED" } : c));
    }
  };

  const filteredCampaigns = campaignsList.filter((c) => {
    const matchesStatus = filterStatus === "all" || c.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesStage = filterStage === "all" || c.stage.toLowerCase() === filterStage.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesStage && matchesSearch;
  });

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Marketing Campaign Operations
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Campaign & Content Plan Workspace
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage campaign lifecycles across Awareness, Engagement, Lead Generation & Conversion stages
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-[180px]">
            <FiSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-8 text-xs w-[130px] border-border/50 bg-background/50">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="awareness">Awareness</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="lead generation">Lead Generation</SelectItem>
              <SelectItem value="conversion">Conversion</SelectItem>
              <SelectItem value="retention">Retention</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[120px] border-border/50 bg-background/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
            <Link href="/dashboard/marketing/campaigns/create">
              <FiPlus className="mr-1.5 h-3.5 w-3.5" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. CAMPAIGNS SUMMARY STRIP */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Active Campaigns</span>
          <div className="text-2xl font-extrabold text-foreground">3</div>
          <span className="text-[10px] text-emerald-500 font-medium">1 launching soon</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Lead Gen Stage Campaigns</span>
          <div className="text-2xl font-extrabold text-blue-500">2</div>
          <span className="text-[10px] text-muted-foreground">High Intent Focus</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Allocated Budget</span>
          <div className="text-2xl font-extrabold text-foreground">৳3,65,000</div>
          <span className="text-[10px] text-muted-foreground">Across 5 campaigns</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Average CPL</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">৳1,242</div>
          <span className="text-[10px] text-emerald-500 font-semibold">Target: &lt;৳1,500</span>
        </div>
      </div>

      {/* 3. CAMPAIGNS LIST TABLE WITH VISIBLE ACTION BUTTONS AND STAGE BADGES */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
              <FiLayers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Marketing Campaigns Ledger</h2>
              <p className="text-xs text-muted-foreground">Campaign stages, ad channels, spend, leads & quick action buttons</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filteredCampaigns.length} Campaigns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Campaign Name</th>
                <th className="px-4 py-3">Campaign Stage</th>
                <th className="px-4 py-3">Channel / Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Spent</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{c.id}</span>
                  </td>

                  {/* STAGE BADGE COLUMN */}
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.2 font-semibold ${
                        c.stage === "Awareness"
                          ? "text-blue-500 border-blue-500/30 bg-blue-500/5"
                          : c.stage === "Engagement"
                          ? "text-purple-500 border-purple-500/30 bg-purple-500/5"
                          : c.stage === "Lead Generation"
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                          : c.stage === "Conversion"
                          ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                          : "text-indigo-500 border-indigo-500/30 bg-indigo-500/5"
                      }`}
                    >
                      {c.stage}
                    </Badge>
                  </td>

                  <td className="px-4 py-3.5 text-muted-foreground">
                    <div>{c.channel}</div>
                    <span className="text-[9px] font-mono text-muted-foreground/70 uppercase">{c.type}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">
                    {c.startDate} to {c.endDate}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-foreground">{c.budget}</td>
                  <td className="px-4 py-3.5 font-mono text-amber-500 font-medium">{c.spent}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{c.leads}</td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                        c.status === "ACTIVE"
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                          : c.status === "SCHEDULED"
                          ? "text-blue-500 border-blue-500/30 bg-blue-500/5"
                          : c.status === "COMPLETED"
                          ? "text-muted-foreground border-border"
                          : "text-rose-500 border-rose-500/30 bg-rose-500/5"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </td>

                  {/* VISIBLE ACTION BUTTONS COLUMN */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-medium" asChild title="View Details">
                        <Link href={`/dashboard/marketing/campaigns/${c.id}`}>
                          <FiEye className="mr-1 h-3 w-3 text-blue-500" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-medium" asChild title="Edit Campaign">
                        <Link href={`/dashboard/marketing/campaigns/${c.id}`}>
                          <FiEdit className="mr-1 h-3 w-3 text-amber-500" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-medium text-rose-500 border-rose-200 dark:border-rose-900/40 hover:bg-rose-500/10" onClick={() => handleTrashCampaign(c.id)} title="Move to Trash">
                        <FiTrash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CAMPAIGN MODAL WITH STAGE SELECTOR */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-lg font-bold text-foreground">Create New Marketing Campaign</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreateModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Brand Awareness Drive"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Campaign Stage (Content Plan)</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                  >
                    <option value="Awareness">1. Awareness</option>
                    <option value="Engagement">2. Engagement</option>
                    <option value="Lead Generation">3. Lead Generation</option>
                    <option value="Conversion">4. Conversion</option>
                    <option value="Retention">5. Retention</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Campaign Type</label>
                  <select
                    value={formData.campaignType}
                    onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                  >
                    <option value="DIGITAL_MARKETING">Digital Marketing</option>
                    <option value="BRANDING">Branding</option>
                    <option value="EMAIL">Email</option>
                    <option value="EVENTS">Events</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Primary Channel</label>
                <input
                  type="text"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Campaign Objective</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-semibold">
                  Create Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
