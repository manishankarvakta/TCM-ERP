"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FiArrowLeft,
  FiEdit,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiDollarSign,
  FiTrendingUp,
  FiZap,
  FiCheckSquare,
  FiList,
  FiCornerUpRight,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

interface StageDetailViewProps {
  campaignId: string;
  stageId: string;
}

export default function StageDetailView({ campaignId, stageId }: StageDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [showAddReqModal, setShowAddReqModal] = useState(false);

  // Mock / Initial Stage State
  const [stage, setStage] = useState({
    id: stageId,
    name: "Lead Generation",
    position: 4,
    totalStages: 7,
    status: "ACTIVE",
    objective: "Convert engaged prospects into identifiable sales inquiries via high-intent lead forms and demo requests.",
    keyMessage: "Transform your garment manufacturing operations with real-time ERP analytics.",
    customerProblem: "Loss of profit due to disconnected inventory, production delays & manual payroll.",
    valueProp: "Unified Bangladesh Garments ERP — 100% real-time tracking from yarn to export invoice.",
    targetAudience: "Garments Managing Directors, Factory Operations Heads & Finance Controllers",
    primaryCTA: "Book Free Factory Consultation",
    plannedBudget: "৳1,40,000",
    actualSpend: "৳95,000",
    leadsTarget: 500,
    leadsActual: 421,
    cplTarget: "৳800",
    cplActual: "৳225",
    readinessScore: 92,
  });

  const [ideas, setIdeas] = useState([
    { id: "IDEA-1", title: "Why Garment Factories Lose 15% Profit Without ERP", pillar: "Educational", status: "IDEA" },
    { id: "IDEA-2", title: "Biometric Attendance & OT Calculation Demo Video", pillar: "Product Demo", status: "CONVERTED" },
    { id: "IDEA-3", title: "Garments Production Dashboard Case Study", pillar: "Social Proof", status: "SELECTED" },
  ]);

  const [requirements, setRequirements] = useState([
    { id: "REQ-1", title: "Factory Production Screen Recording", status: "READY" },
    { id: "REQ-2", title: "Client Video Testimonial (Standard Chartered)", status: "READY" },
    { id: "REQ-3", title: "Bengali Landing Page Copywriting", status: "READY" },
    { id: "REQ-4", title: "Bangla Voice-Over Recording", status: "IN_PROGRESS" },
  ]);

  const [activities, setActivities] = useState([
    { id: "ACT-1", title: "Launch Meta Lead Generation Ad Set", status: "COMPLETED" },
    { id: "ACT-2", title: "Setup Google Search Keyword Campaign", status: "COMPLETED" },
    { id: "ACT-3", title: "Connect Landing Page Form to CRM API", status: "IN_PROGRESS" },
  ]);

  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newReqTitle, setNewReqTitle] = useState("");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle) return;
    setIdeas([...ideas, { id: `IDEA-${ideas.length + 1}`, title: newIdeaTitle, pillar: "General", status: "IDEA" }]);
    setNewIdeaTitle("");
    setShowAddIdeaModal(false);
  };

  const handleConvertIdea = (ideaId: string) => {
    setIdeas(ideas.map(i => i.id === ideaId ? { ...i, status: "CONVERTED" } : i));
    alert("Idea converted into a real Marketing Content Item linked to this stage!");
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqTitle) return;
    setRequirements([...requirements, { id: `REQ-${requirements.length + 1}`, title: newReqTitle, status: "REQUIRED" }]);
    setNewReqTitle("");
    setShowAddReqModal(false);
  };

  const handleToggleReq = (id: string) => {
    setRequirements(requirements.map(r => r.id === id ? { ...r, status: r.status === "READY" ? "REQUIRED" : "READY" } : r));
  };

  const readyCount = requirements.filter(r => r.status === "READY").length;
  const calculatedReadiness = requirements.length > 0 ? Math.round((readyCount / requirements.length) * 100) : 100;

  return (
    <div className="flex-1 space-y-6 max-w-[1400px] mx-auto text-foreground">
      {/* 1. TOP HEADER & BACK LINK */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href={`/dashboard/marketing/campaigns/${campaignId}`}>
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Campaign Funnel
          </Link>
        </Button>
      </div>

      {/* 2. STAGE HEADER CARD */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Stage {stage.position}: {stage.name}
            </h1>
            <Badge variant="outline" className="text-[11px] font-semibold px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Funnel Position {stage.position} of {stage.totalStages}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
              {stage.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            {stage.objective}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => setShowAddIdeaModal(true)}>
            <FiZap className="mr-1.5 h-3.5 w-3.5" />
            Add Idea
          </Button>
        </div>
      </div>

      {/* 3. INTERNAL TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold">Overview & Budget</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs font-semibold">Strategy & Messaging</TabsTrigger>
          <TabsTrigger value="ideas" className="text-xs font-semibold">Idea Bank ({ideas.length})</TabsTrigger>
          <TabsTrigger value="requirements" className="text-xs font-semibold">Requirements ({readyCount}/{requirements.length})</TabsTrigger>
          <TabsTrigger value="activities" className="text-xs font-semibold">Activities & Tasks</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & BUDGET */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
            <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Stage Budget</span>
              <div className="text-2xl font-extrabold text-foreground">{stage.plannedBudget}</div>
              <span className="text-[10px] text-muted-foreground">Allocated Envelope</span>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Actual Spend</span>
              <div className="text-2xl font-extrabold text-amber-500">{stage.actualSpend}</div>
              <span className="text-[10px] text-amber-500 font-medium">67.8% Utilization</span>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Leads Generated</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stage.leadsActual}</div>
              <span className="text-[10px] text-emerald-500 font-semibold">Target: {stage.leadsTarget} (84.2%)</span>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Cost Per Lead (CPL)</span>
              <div className="text-2xl font-extrabold text-indigo-500">{stage.cplActual}</div>
              <span className="text-[10px] text-muted-foreground">Target: &lt;{stage.cplTarget}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-foreground">Content & Resource Readiness Score</span>
              <span className="font-mono text-emerald-500 font-bold">{calculatedReadiness}% Ready</span>
            </div>
            <Progress value={calculatedReadiness} className="h-2.5" />
            <p className="text-[11px] text-muted-foreground">
              {readyCount} of {requirements.length} mandatory assets, copy drafts, and tracking integrations ready.
            </p>
          </div>
        </TabsContent>

        {/* TAB 2: STRATEGY & MESSAGING */}
        <TabsContent value="strategy" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Stage Strategy & Positioning</h2>

            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Key Message</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{stage.keyMessage}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Customer Problem Addressed</span>
                <p className="font-medium text-foreground mt-0.5">{stage.customerProblem}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Value Proposition</span>
                <p className="font-medium text-foreground mt-0.5">{stage.valueProp}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Primary Call-To-Action (CTA)</span>
                <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-300 mt-1">
                  {stage.primaryCTA}
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: IDEA BANK */}
        <TabsContent value="ideas" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Content Idea Bank</h2>
                <p className="text-xs text-muted-foreground">Brainstorm and convert ideas into scheduled content items</p>
              </div>
              <Button size="sm" className="h-8 text-xs font-semibold px-3" onClick={() => setShowAddIdeaModal(true)}>
                <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Add Idea
              </Button>
            </div>

            <div className="space-y-3">
              {ideas.map((i) => (
                <div key={i.id} className="p-3.5 rounded-xl border border-border/40 bg-background/50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{i.title}</div>
                    <span className="text-[10px] text-muted-foreground">Pillar: {i.pillar}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                        i.status === "CONVERTED" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                      }`}
                    >
                      {i.status}
                    </Badge>

                    {i.status !== "CONVERTED" && (
                      <Button size="sm" variant="outline" className="h-7 text-[11px] font-medium" onClick={() => handleConvertIdea(i.id)}>
                        <FiCornerUpRight className="mr-1 h-3 w-3" />
                        Convert to Content
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: REQUIREMENTS */}
        <TabsContent value="requirements" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Content Requirements Checklist</h2>
                <p className="text-xs text-muted-foreground">Assets and collateral required prior to stage launch</p>
              </div>
              <Button size="sm" className="h-8 text-xs font-semibold px-3" onClick={() => setShowAddReqModal(true)}>
                <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Add Requirement
              </Button>
            </div>

            <div className="space-y-2">
              {requirements.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-border/40 bg-background/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.status === "READY"}
                      onChange={() => handleToggleReq(r.id)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className={`font-medium ${r.status === "READY" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {r.title}
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${r.status === "READY" ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"}`}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: ACTIVITIES */}
        <TabsContent value="activities" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Stage Activities & Action Items</h2>
            <div className="space-y-2 text-xs">
              {activities.map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-border/40 bg-background/50 flex items-center justify-between">
                  <span className="font-medium text-foreground">{a.title}</span>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold text-emerald-500 border-emerald-500/30">
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD IDEA MODAL */}
      {showAddIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Add Content Idea</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddIdeaModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddIdea} className="space-y-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">Idea Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Production Line Before vs After ERP"
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddIdeaModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="font-semibold">Save Idea</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD REQUIREMENT MODAL */}
      {showAddReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Add Content Requirement</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddReqModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddRequirement} className="space-y-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">Requirement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-res product screenshot"
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddReqModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="font-semibold">Save Requirement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
