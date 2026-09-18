"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiArrowLeft,
  FiChevronRight,
  FiTarget,
  FiUsers,
  FiDollarSign,
  FiAward,
  FiBriefcase,
  FiTrendingUp,
  FiLayers,
  FiCheckCircle,
  FiGlobe,
  FiMessageSquare,
  FiPieChart,
  FiInfo,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiZap,
  FiX,
} from "react-icons/fi";
import { createMarketingFunnelPlanAction } from "@/app/actions/crm/marketing-operations.action";
import { getAssignableUsers } from "@/app/actions/user.action";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";

interface FieldGuideProps {
  label: string;
  hint: string;
  example?: string;
  required?: boolean;
  className?: string;
}

function FieldGuide({ label, hint, example, required = false, className }: FieldGuideProps) {
  return (
    <div className={cn("flex items-center gap-1.5 mb-1.5", className)}>
      <span className="text-xs font-semibold text-foreground/90">
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none"
            title={`Field guide for ${label}`}
            aria-label={`Guide for ${label}`}
          >
            <FiInfo className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={6}
          className="w-80 p-3.5 text-xs shadow-xl border-border/80 bg-popover text-popover-foreground rounded-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs pb-1 border-b border-border/40">
              <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FiInfo className="h-3 w-3" />
              </span>
              <span>{label} Guide</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">{hint}</p>
            {example && (
              <div className="p-2 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
                <span className="font-semibold text-foreground block mb-0.5">Example:</span>
                <span className="text-muted-foreground italic">{example}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface AssignableUserItem {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

export interface FunnelStageItem {
  id: string;
  name: string;
  position: number;
  objective: string;
  plannedBudget: number;
  mainKPI: string;
  kpiTarget: string;
  selectedCampaigns: string[];
}

const STAGE_PRESETS = [
  {
    name: "Awareness",
    label: "01. Awareness (Top of Funnel - Reach & Education)",
    defaultObjective: "Build broad brand reach, educate prospects on industry problems, and drive content discovery.",
    defaultKPI: "Reach",
  },
  {
    name: "Consideration / Interest",
    label: "02. Consideration / Interest (Middle of Funnel)",
    defaultObjective: "Drive problem engagement, case study reviews, and solution comparison downloads.",
    defaultKPI: "Content Views",
  },
  {
    name: "Lead Generation",
    label: "03. Lead Generation (High-Intent Capture)",
    defaultObjective: "Capture qualified prospect contact details and trial/demo requests.",
    defaultKPI: "Leads",
  },
  {
    name: "Lead Nurturing",
    label: "04. Lead Nurturing & Follow-up",
    defaultObjective: "Educate captured leads through automated email drip sequences and sales touches.",
    defaultKPI: "SQLs",
  },
  {
    name: "Sales Conversion",
    label: "05. Sales Conversion (Bottom of Funnel - Deal Closing)",
    defaultObjective: "Submit proposals, commercial negotiations, and close won contracts.",
    defaultKPI: "Won Deals",
  },
  {
    name: "Retention & Remarketing",
    label: "06. Retention, Upselling & Customer Loyalty",
    defaultObjective: "Drive contract renewals, expansion MRR, and client referrals.",
    defaultKPI: "Renewals",
  },
];

const AVAILABLE_CAMPAIGNS = [
  "Meta / Facebook Lead Ads",
  "Google Search Intent Ads",
  "LinkedIn Sponsored InMail & Thought Leadership",
  "YouTube Video Product Demos",
  "Automated Email Drip Sequence",
  "WhatsApp Business Messaging",
  "Outbound B2B Direct Sales Outreach",
  "Industry Webinars & Virtual Events",
  "SEO & Organic Content Inbound",
  "Influencer & PR Outreach",
];

interface CreateMarketingFunnelViewProps {
  initialUsers?: AssignableUserItem[];
}

export default function CreateMarketingFunnelView({ initialUsers = [] }: CreateMarketingFunnelViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") || searchParams.get("tab");
  const initialStep = stepParam ? Math.max(1, Math.min(5, parseInt(stepParam, 10) || 1)) : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AssignableUserItem[]>(initialUsers);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Fallback client fetch for assignable users if initialUsers is empty
  React.useEffect(() => {
    if (initialUsers.length === 0) {
      getAssignableUsers().then((res) => {
        if (res.success && res.users) {
          setAvailableUsers(res.users);
        }
      });
    }
  }, [initialUsers]);

  // STEP 1 — FUNNEL SETUP (CLEAN BLANK INITIAL STATE)
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [usp, setUsp] = useState("");
  const [mainCTA, setMainCTA] = useState("");
  const [primaryObjective, setPrimaryObjective] = useState("");
  const [leadTarget, setLeadTarget] = useState("");
  const [sqlTarget, setSqlTarget] = useState("");
  const [customerTarget, setCustomerTarget] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");

  // STEP 2 — AUDIENCE & MARKET (CLEAN BLANK INITIAL STATE)
  const [audienceSegment, setAudienceSegment] = useState("");
  const [decisionMakers, setDecisionMakers] = useState("");
  const [marketOpportunity, setMarketOpportunity] = useState("");
  const [keyCompetitors, setKeyCompetitors] = useState("");
  const [marketGaps, setMarketGaps] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [coreMessage, setCoreMessage] = useState("");
  const [campaignTheme, setCampaignTheme] = useState("");

  // STEP 3 — DYNAMIC STAGES (INLINE MANAGEMENT)
  const [stages, setStages] = useState<FunnelStageItem[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isStageFormOpen, setIsStageFormOpen] = useState(false);

  // STAGE FORM INLINE STATE
  const [stagePreset, setStagePreset] = useState<string>("");
  const [stageName, setStageName] = useState<string>("");
  const [stageObjective, setStageObjective] = useState<string>("");
  const [stageBudget, setStageBudget] = useState<string>("");
  const [stageKPI, setStageKPI] = useState<string>("");
  const [stageKPITarget, setStageKPITarget] = useState<string>("");
  const [stageCampaigns, setStageCampaigns] = useState<string[]>([]);
  const [selectedCampaignToAdd, setSelectedCampaignToAdd] = useState<string>("");

  // STEP 4 — EXECUTION PLAN (CLEAN BLANK INITIAL STATE)
  const channelOptions = [
    "Facebook",
    "Instagram",
    "LinkedIn",
    "YouTube",
    "Google Search",
    "SEO",
    "Email",
    "SMS",
    "WhatsApp",
    "Website",
    "Events",
    "Referral",
    "Sales Outreach",
  ];
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [contentPillars, setContentPillars] = useState("");
  const [approvedBudget, setApprovedBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mainConversionGoal, setMainConversionGoal] = useState("");
  const [funnelOwner, setFunnelOwner] = useState("");

  // Live Budget Calculations
  const allocatedStageBudget = stages.reduce(
    (acc, curr) => acc + (curr.plannedBudget || 0),
    0
  );
  const totalApproved = parseInt(approvedBudget || "0");
  const unallocatedBudget = Math.max(0, totalApproved - allocatedStageBudget);

  const stepsList = [
    { num: 1, title: "Funnel Setup" },
    { num: 2, title: "Audience & Market" },
    { num: 3, title: "Funnel Stages" },
    { num: 4, title: "Execution Plan" },
    { num: 5, title: "Review & Create" },
  ];

  // URL-based step navigation (preserves step on reload)
  const goToStep = (step: number) => {
    const targetStep = Math.max(1, Math.min(5, step));
    setCurrentStep(targetStep);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", targetStep.toString());
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Sync state if URL search param changes externally (e.g. browser back/forward)
  React.useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5 && parsed !== currentStep) {
        setCurrentStep(parsed);
      }
    }
  }, [stepParam]);

  // RESTORE DRAFT FROM LOCALSTORAGE ON MOUNT (PREVENTS DATA LOSS ON RELOAD)
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tcm_marketing_funnel_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            if (parsed.name) setName(parsed.name);
            if (parsed.productName) setProductName(parsed.productName);
            if (parsed.productDescription) setProductDescription(parsed.productDescription);
            if (parsed.problemSolved) setProblemSolved(parsed.problemSolved);
            if (parsed.usp) setUsp(parsed.usp);
            if (parsed.mainCTA) setMainCTA(parsed.mainCTA);
            if (parsed.primaryObjective) setPrimaryObjective(parsed.primaryObjective);
            if (parsed.leadTarget) setLeadTarget(parsed.leadTarget);
            if (parsed.sqlTarget) setSqlTarget(parsed.sqlTarget);
            if (parsed.customerTarget) setCustomerTarget(parsed.customerTarget);
            if (parsed.targetRevenue) setTargetRevenue(parsed.targetRevenue);
            if (parsed.audienceSegment) setAudienceSegment(parsed.audienceSegment);
            if (parsed.decisionMakers) setDecisionMakers(parsed.decisionMakers);
            if (parsed.marketOpportunity) setMarketOpportunity(parsed.marketOpportunity);
            if (parsed.keyCompetitors) setKeyCompetitors(parsed.keyCompetitors);
            if (parsed.marketGaps) setMarketGaps(parsed.marketGaps);
            if (parsed.valueProp) setValueProp(parsed.valueProp);
            if (parsed.coreMessage) setCoreMessage(parsed.coreMessage);
            if (parsed.campaignTheme) setCampaignTheme(parsed.campaignTheme);
            if (Array.isArray(parsed.stages) && parsed.stages.length > 0) setStages(parsed.stages);
            if (Array.isArray(parsed.selectedChannels) && parsed.selectedChannels.length > 0) setSelectedChannels(parsed.selectedChannels);
            if (parsed.contentPillars) setContentPillars(parsed.contentPillars);
            if (parsed.approvedBudget) setApprovedBudget(parsed.approvedBudget);
            if (parsed.startDate) setStartDate(parsed.startDate);
            if (parsed.endDate) setEndDate(parsed.endDate);
            if (parsed.mainConversionGoal) setMainConversionGoal(parsed.mainConversionGoal);
            if (parsed.funnelOwner) setFunnelOwner(parsed.funnelOwner);
            if (parsed.savedAt) setDraftSavedAt(parsed.savedAt);

            // If URL doesn't have an explicit ?step=, restore saved step
            const currentUrlStep = new URLSearchParams(window.location.search).get("step");
            if (!currentUrlStep && parsed.currentStep) {
              goToStep(parsed.currentStep);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore funnel draft from localStorage:", e);
    } finally {
      setHasRestoredDraft(true);
    }
  }, []);

  // AUTO-SAVE DRAFT TO LOCALSTORAGE WHEN FIELDS CHANGE
  React.useEffect(() => {
    if (!hasRestoredDraft) return;

    const timer = setTimeout(() => {
      try {
        const hasAnyData = Boolean(
          name || productName || productDescription || problemSolved || usp ||
          primaryObjective || targetRevenue || audienceSegment || stages.length > 0 ||
          selectedChannels.length > 0 || approvedBudget || contentPillars
        );

        if (hasAnyData && typeof window !== "undefined") {
          const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const draft = {
            currentStep,
            name,
            productName,
            productDescription,
            problemSolved,
            usp,
            mainCTA,
            primaryObjective,
            leadTarget,
            sqlTarget,
            customerTarget,
            targetRevenue,
            audienceSegment,
            decisionMakers,
            marketOpportunity,
            keyCompetitors,
            marketGaps,
            valueProp,
            coreMessage,
            campaignTheme,
            stages,
            selectedChannels,
            contentPillars,
            approvedBudget,
            startDate,
            endDate,
            mainConversionGoal,
            funnelOwner,
            savedAt: now,
          };
          localStorage.setItem("tcm_marketing_funnel_draft", JSON.stringify(draft));
          setDraftSavedAt(now);
        }
      } catch (e) {
        console.warn("Failed to auto-save funnel draft:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    hasRestoredDraft,
    currentStep,
    name,
    productName,
    productDescription,
    problemSolved,
    usp,
    mainCTA,
    primaryObjective,
    leadTarget,
    sqlTarget,
    customerTarget,
    targetRevenue,
    audienceSegment,
    decisionMakers,
    marketOpportunity,
    keyCompetitors,
    marketGaps,
    valueProp,
    coreMessage,
    campaignTheme,
    stages,
    selectedChannels,
    contentPillars,
    approvedBudget,
    startDate,
    endDate,
    mainConversionGoal,
    funnelOwner,
  ]);

  // Reset/Discard Local Draft
  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to discard your saved draft and reset all fields?")) {
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("tcm_marketing_funnel_draft");
        }
      } catch {}
      setName("");
      setProductName("");
      setProductDescription("");
      setProblemSolved("");
      setUsp("");
      setMainCTA("");
      setPrimaryObjective("");
      setLeadTarget("");
      setSqlTarget("");
      setCustomerTarget("");
      setTargetRevenue("");
      setAudienceSegment("");
      setDecisionMakers("");
      setMarketOpportunity("");
      setKeyCompetitors("");
      setMarketGaps("");
      setValueProp("");
      setCoreMessage("");
      setCampaignTheme("");
      setStages([]);
      setSelectedChannels([]);
      setContentPillars("");
      setApprovedBudget("");
      setStartDate("");
      setEndDate("");
      setMainConversionGoal("");
      setFunnelOwner("");
      setDraftSavedAt(null);
      goToStep(1);
    }
  };

  // Start Editing a Stage (Inline Card Expansion)
  const handleEditStage = (stageToEdit: FunnelStageItem) => {
    setIsStageFormOpen(false);
    setEditingStageId(stageToEdit.id);
    setStagePreset(stageToEdit.name);
    setStageName(stageToEdit.name);
    setStageObjective(stageToEdit.objective || "");
    setStageBudget(stageToEdit.plannedBudget ? stageToEdit.plannedBudget.toString() : "");
    setStageKPI(stageToEdit.mainKPI || "");
    setStageKPITarget(stageToEdit.kpiTarget || "");
    setStageCampaigns(stageToEdit.selectedCampaigns || []);
    setSelectedCampaignToAdd("");
  };

  // Reset Stage Form
  const handleResetStageForm = () => {
    setEditingStageId(null);
    setStagePreset("");
    setStageName("");
    setStageObjective("");
    setStageBudget("");
    setStageKPI("");
    setStageKPITarget("");
    setStageCampaigns([]);
    setSelectedCampaignToAdd("");
    setIsStageFormOpen(false);
  };

  // Handle Preset Dropdown Selection
  const handleSelectPreset = (selectedPresetName: string) => {
    setStagePreset(selectedPresetName);
    const found = STAGE_PRESETS.find((p) => p.name === selectedPresetName);
    if (found) {
      setStageName(found.name);
      setStageObjective(found.defaultObjective);
      setStageKPI(found.defaultKPI);
    }
  };

  // Add Campaign to Current Stage
  const handleAddCampaignToStage = (campaignName: string) => {
    const trimmed = campaignName.trim();
    if (trimmed && !stageCampaigns.includes(trimmed)) {
      setStageCampaigns((prev) => [...prev, trimmed]);
    }
    setSelectedCampaignToAdd("");
  };

  // Remove Campaign from Current Stage
  const handleRemoveCampaignFromStage = (campaignName: string) => {
    setStageCampaigns((prev) => prev.filter((c) => c !== campaignName));
  };

  // Save / Add Stage Inline
  const handleSaveStage = () => {
    if (!stageName.trim()) {
      alert("Please select or enter a Stage Name");
      return;
    }

    const budgetVal = parseInt(stageBudget || "0");

    if (editingStageId) {
      setStages((prev) =>
        prev.map((s) =>
          s.id === editingStageId
            ? {
                ...s,
                name: stageName,
                objective: stageObjective,
                plannedBudget: budgetVal,
                mainKPI: stageKPI,
                kpiTarget: stageKPITarget,
                selectedCampaigns: stageCampaigns,
              }
            : s
        )
      );
    } else {
      const newStage: FunnelStageItem = {
        id: `stg-${Date.now()}`,
        name: stageName,
        position: stages.length + 1,
        objective: stageObjective,
        plannedBudget: budgetVal,
        mainKPI: stageKPI,
        kpiTarget: stageKPITarget,
        selectedCampaigns: stageCampaigns,
      };
      setStages((prev) => [...prev, newStage]);
    }

    handleResetStageForm();
  };

  // Delete Stage
  const handleDeleteStage = (id: string) => {
    setStages((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, position: idx + 1 }))
    );
    if (editingStageId === id) {
      handleResetStageForm();
    }
  };

  // 1-Click Load 5-Stage Blueprint
  const handleApplyDefaultBlueprint = () => {
    const defaultList: FunnelStageItem[] = STAGE_PRESETS.slice(0, 5).map((p, idx) => ({
      id: `stg-default-${idx + 1}`,
      name: p.name,
      position: idx + 1,
      objective: p.defaultObjective,
      plannedBudget: 0,
      mainKPI: p.defaultKPI,
      kpiTarget: "",
      selectedCampaigns: [],
    }));
    setStages(defaultList);
  };

  const handleCreateSubmit = async (isDraft = false) => {
    if (!name.trim()) {
      alert("Please enter a Marketing Funnel Name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMarketingFunnelPlanAction({
        name,
        productName,
        productDescription,
        problemSolved,
        usp,
        mainCTA,
        primaryObjective,
        leadTarget: parseInt(leadTarget || "0"),
        sqlTarget: parseInt(sqlTarget || "0"),
        customerTarget: parseInt(customerTarget || "0"),
        targetRevenue: parseInt(targetRevenue || "0"),
        approvedBudget: totalApproved,
        startDate,
        endDate,
        channels: selectedChannels,
        contentPillars,
        funnelOwner,
        mainConversionGoal,
        isDraft,
        selectedStages: stages.map((s) => ({
          name: s.name,
          position: s.position,
          objective: s.objective,
          plannedBudget: s.plannedBudget,
          mainKPI: s.mainKPI,
        })),
        plannedCampaigns: stages.flatMap((s) =>
          s.selectedCampaigns.map((cName) => ({
            name: `${s.name}: ${cName}`,
            stageName: s.name,
            objective: s.objective,
            channel: cName,
            budget: s.plannedBudget,
            mainKPI: s.mainKPI,
            target: s.kpiTarget,
          }))
        ),
      });

      setIsSubmitting(false);

      if (res.success && res.funnelId) {
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem("tcm_marketing_funnel_draft");
          }
        } catch {}
        router.push(`/dashboard/marketing/marketing-funnel/${res.funnelId}`);
      } else {
        alert(res.error || "Failed to submit marketing funnel");
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert("Error submitting form");
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1200px] mx-auto text-foreground pb-12">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-9 text-xs font-semibold">
          <Link href="/dashboard/marketing/marketing-funnel">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Marketing Funnels
          </Link>
        </Button>

        <div className="flex items-center gap-2.5">
          {draftSavedAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Autosaved ({draftSavedAt})</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="text-muted-foreground hover:text-rose-500 ml-1 transition-colors cursor-pointer"
                title="Discard saved draft and reset fields"
              >
                <FiTrash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold"
            onClick={() => handleCreateSubmit(true)}
          >
            Save Draft
          </Button>
        </div>
      </div>

      {/* 5-STEPPER BAR */}
      <div className="p-2 rounded-2xl border border-border/50 bg-card/60 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {stepsList.map((st) => (
            <button
              key={st.num}
              onClick={() => goToStep(st.num)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentStep === st.num
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : currentStep > st.num
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === st.num
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : currentStep > st.num
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {st.num}
              </span>
              <span>{st.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* STEP 1: FUNNEL SETUP & STRATEGIC GOALS                   */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FiTarget className="text-primary h-5 w-5" />
                Step 1 — Funnel Setup & Strategic Goals
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Define funnel identity, product details and strategic revenue benchmarks.
              </p>
            </div>

            {/* SECTION 1: FUNNEL IDENTITY & PRODUCT SCOPE */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiBriefcase className="text-primary h-4 w-4" />
                <span>1. Funnel Identity & Product Scope</span>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldGuide
                    label="Marketing Funnel Name"
                    required
                    hint="A clear, memorable name for this strategic marketing funnel to identify it in executive reports and navigation."
                    example="Enterprise Garments ERP Growth Funnel 2026"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Garments ERP Growth Funnel 2026"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldGuide
                      label="Product / Service Name"
                      hint="The primary product, solution package, or SaaS tier being promoted in this funnel."
                      example="Enterprise Garments ERP & HR Suite"
                    />
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Enterprise Garments ERP & HR Suite"
                      className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <FieldGuide
                      label="Main Call-To-Action (CTA)"
                      hint="The single primary action you want prospects to take on ads, landing pages, and lead forms."
                      example="Book Free Factory Digital Audit"
                    />
                    <input
                      type="text"
                      value={mainCTA}
                      onChange={(e) => setMainCTA(e.target.value)}
                      placeholder="e.g. Book Free Factory Digital Audit"
                      className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <FieldGuide
                    label="Product Description"
                    hint="A concise overview of what your product does, its core capabilities, and who it serves."
                    example="All-in-one manufacturing, merchandising, inventory, Bengali payroll & export LC tracking platform for RMG factories."
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={productDescription}
                      onChange={setProductDescription}
                      placeholder="Briefly describe what your product or service provides, how it works, and its delivery model..."
                      minHeight="80px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: PROBLEM & VALUE PROPOSITION */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiAward className="text-amber-500 h-4 w-4" />
                <span>2. Value Proposition & Problem Solving</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldGuide
                    label="Problem Solved"
                    hint="The expensive operational bottlenecks, compliance risks, or pain points your solution eliminates."
                    example="Fabric wastage, delayed export shipments, payroll discrepancies & compliance audit failures"
                  />
                  <input
                    type="text"
                    value={problemSolved}
                    onChange={(e) => setProblemSolved(e.target.value)}
                    placeholder="e.g. Fabric wastage, delayed export shipments, payroll errors"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <FieldGuide
                    label="Unique Selling Proposition (USP)"
                    hint="The distinct competitive advantage that makes your offering superior to existing market alternatives."
                    example="The only ERP engineered specifically for Bangladesh Garment Factories with guaranteed 7-day deployment"
                  />
                  <input
                    type="text"
                    value={usp}
                    onChange={(e) => setUsp(e.target.value)}
                    placeholder="e.g. Guaranteed 7-day deployment with real-time biometric floor tracking"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: STRATEGIC REVENUE & CONVERSION TARGETS */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiTrendingUp className="text-emerald-500 h-4 w-4" />
                <span>3. Strategic Revenue & Growth Benchmarks</span>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldGuide
                    label="Primary Strategic Objective"
                    hint="The high-level qualitative milestone and business results this funnel is designed to accomplish."
                    example="Acquire 100 new enterprise garment factory clients by Q4 2026 across Dhaka & Chittagong RMG hubs"
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={primaryObjective}
                      onChange={setPrimaryObjective}
                      placeholder="e.g. Acquire 100 enterprise factory clients and achieve ৳1.2Cr pipeline revenue by Q4 2026..."
                      minHeight="70px"
                    />
                  </div>
                </div>

                {/* 4-METRIC KPI GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  {/* REVENUE */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <FiDollarSign className="h-4 w-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Target Revenue</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-emerald-600/70 hover:text-emerald-600 transition-colors p-0.5 rounded-full" title="Target Revenue Guide">
                            <FiInfo className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-72 p-3 text-xs shadow-xl border-border/80 bg-popover text-popover-foreground rounded-xl">
                          <p className="font-semibold text-foreground mb-1">Target Revenue Benchmark</p>
                          <p className="text-muted-foreground text-[11px]">Total projected gross revenue (৳) expected to be closed and attributed to this funnel.</p>
                          <div className="mt-1.5 p-1.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">Example: ৳1,20,00,000</div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-600/70">৳</span>
                      <input
                        type="number"
                        value={targetRevenue}
                        onChange={(e) => setTargetRevenue(e.target.value)}
                        placeholder="e.g. 12000000"
                        className="w-full h-9 pl-7 pr-3 rounded-lg border border-emerald-500/40 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  {/* LEADS */}
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <FiUsers className="h-4 w-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Lead Target</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-blue-600/70 hover:text-blue-600 transition-colors p-0.5 rounded-full" title="Lead Target Guide">
                            <FiInfo className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-72 p-3 text-xs shadow-xl border-border/80 bg-popover text-popover-foreground rounded-xl">
                          <p className="font-semibold text-foreground mb-1">Top-of-Funnel Leads (MQLs)</p>
                          <p className="text-muted-foreground text-[11px]">Total raw prospective contacts, inquiries, and form captures expected across all channels.</p>
                          <div className="mt-1.5 p-1.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">Example: 1,500 Leads</div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input
                      type="number"
                      value={leadTarget}
                      onChange={(e) => setLeadTarget(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full h-9 px-3 rounded-lg border border-blue-500/40 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* SQLS */}
                  <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <FiTarget className="h-4 w-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">SQL Target</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-purple-600/70 hover:text-purple-600 transition-colors p-0.5 rounded-full" title="SQL Target Guide">
                            <FiInfo className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-72 p-3 text-xs shadow-xl border-border/80 bg-popover text-popover-foreground rounded-xl">
                          <p className="font-semibold text-foreground mb-1">Sales Qualified Leads (SQLs)</p>
                          <p className="text-muted-foreground text-[11px]">High-intent prospects verified for budget, authority, need and timeline ready for sales meetings.</p>
                          <div className="mt-1.5 p-1.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">Example: 500 SQLs</div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input
                      type="number"
                      value={sqlTarget}
                      onChange={(e) => setSqlTarget(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full h-9 px-3 rounded-lg border border-purple-500/40 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>

                  {/* DEALS */}
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <FiCheckCircle className="h-4 w-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Deal Target</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-amber-600/70 hover:text-amber-600 transition-colors p-0.5 rounded-full" title="Deal Target Guide">
                            <FiInfo className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-72 p-3 text-xs shadow-xl border-border/80 bg-popover text-popover-foreground rounded-xl">
                          <p className="font-semibold text-foreground mb-1">Closed-Won Deals</p>
                          <p className="text-muted-foreground text-[11px]">Final finalized contracts and paying customers expected to convert from this funnel.</p>
                          <div className="mt-1.5 p-1.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">Example: 100 Deals</div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input
                      type="number"
                      value={customerTarget}
                      onChange={(e) => setCustomerTarget(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-9 px-3 rounded-lg border border-amber-500/40 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: AUDIENCE & MARKET ANALYSIS                       */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FiUsers className="text-primary h-5 w-5" />
                Step 2 — Audience & Market Analysis
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Define audience segments, decision makers, market gaps and core messaging.
              </p>
            </div>

            {/* AUDIENCE & DECISION MAKERS */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiUsers className="text-primary h-4 w-4" />
                <span>1. Target Audience & Stakeholders</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldGuide
                    label="Audience Segment"
                    hint="The specific industry vertical, company size, revenue tier, or geographical area you are targeting."
                    example="Tier-1 & Tier-2 Export Garment Manufacturers with 500+ workers"
                  />
                  <input
                    type="text"
                    value={audienceSegment}
                    onChange={(e) => setAudienceSegment(e.target.value)}
                    placeholder="e.g. Tier-1 & Tier-2 Export Garment Manufacturers with 500+ workers"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <FieldGuide
                    label="Key Decision Makers"
                    hint="The key executive stakeholders and job titles who evaluate, approve budget, and sign the contract."
                    example="Managing Directors, Chief Operating Officers, Heads of IT & General Managers"
                  />
                  <input
                    type="text"
                    value={decisionMakers}
                    onChange={(e) => setDecisionMakers(e.target.value)}
                    placeholder="e.g. Managing Directors, Chief Operating Officers, Heads of IT"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* MARKET DYNAMICS & COMPETITORS */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiGlobe className="text-blue-500 h-4 w-4" />
                <span>2. Market Dynamics & Competitor Landscape</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldGuide
                    label="Market Opportunity"
                    hint="Macro trends, regulatory mandates, or modernization shifts making now the optimal time for prospects to buy."
                    example="Rising international buyer mandates for automated biometric payroll and real-time floor monitoring"
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={marketOpportunity}
                      onChange={setMarketOpportunity}
                      placeholder="Describe market growth, compliance mandates, or digitalization trends driving demand..."
                      minHeight="70px"
                    />
                  </div>
                </div>

                <div>
                  <FieldGuide
                    label="Key Competitors"
                    hint="Direct alternative software providers or legacy substitute workflows currently used by target customers."
                    example="Legacy on-premise software, generic international ERPs (SAP, NetSuite), manual spreadsheets"
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={keyCompetitors}
                      onChange={setKeyCompetitors}
                      placeholder="e.g. Legacy on-premise software, generic international ERPs, manual Excel sheets"
                      minHeight="70px"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <FieldGuide
                    label="Market Gaps"
                    hint="Unaddressed customer frustrations and weaknesses in competitor offerings that your product capitalizes on."
                    example="Competitors require 6+ months for deployment and lack localized Bengali compliance payroll rules"
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={marketGaps}
                      onChange={setMarketGaps}
                      placeholder="What are competitors failing to deliver? e.g. High upfront license costs, slow implementation, lack of local support..."
                      minHeight="70px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MESSAGING & VALUE PROPOSITION */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-sm font-bold text-foreground">
                <FiMessageSquare className="text-purple-500 h-4 w-4" />
                <span>3. Campaign Messaging & Positioning</span>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldGuide
                    label="Value Proposition"
                    hint="A clear, compelling promise of tangible business value that your campaigns communicate to prospects."
                    example="Eliminate fabric wastage by 18% and automate payroll compliance in under 7 business days"
                  />
                  <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                    <RichTextEditor
                      value={valueProp}
                      onChange={setValueProp}
                      placeholder="e.g. Eliminate fabric wastage by 18% and automate payroll compliance in under 7 business days"
                      minHeight="70px"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldGuide
                      label="Campaign Theme"
                      hint="The overarching creative angle, headline concept, or slogan unifying your ad copy and content."
                      example="The RMG Factory Digital Transformation Drive 2026"
                    />
                    <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                      <RichTextEditor
                        value={campaignTheme}
                        onChange={setCampaignTheme}
                        placeholder="e.g. The RMG Factory Digital Transformation Drive 2026"
                        minHeight="60px"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldGuide
                      label="Core Message"
                      hint="The central takeaway message that must stick with prospects across every ad, email, and landing page."
                      example="Modernize your factory floor with real-time tracking and zero compliance audit worries"
                    />
                    <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                      <RichTextEditor
                        value={coreMessage}
                        onChange={setCoreMessage}
                        placeholder="e.g. Modernize your factory floor with real-time tracking and zero compliance audit worries"
                        minHeight="60px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: FUNNEL STAGES (INLINE MANAGEMENT WORKFLOW)       */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* STEP 3 HEADER */}
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FiLayers className="text-primary h-5 w-5" />
                Step 3 — Funnel Stages & Multi-Campaign Strategy
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Configure sequential marketing stages, assign linked campaigns, and allocate stage KPI benchmarks.
              </p>
            </div>

            {/* LIVE BUDGET SUMMARY BAR */}
            <div className="p-4.5 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Approved Budget
                  </span>
                  <div className="text-lg font-bold text-foreground">
                    ৳{totalApproved.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Allocated Stages
                  </span>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ৳{allocatedStageBudget.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Unallocated
                  </span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{unallocatedBudget.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="text-xs font-bold text-purple-600 border-purple-300">
                  {stages.length} Stages Configured
                </Badge>
                {!isStageFormOpen && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleResetStageForm();
                      setIsStageFormOpen(true);
                    }}
                    className="h-8 px-3 text-xs font-semibold shadow-xs"
                  >
                    <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Add New Stage
                  </Button>
                )}
              </div>
            </div>

            {/* INLINE NEW STAGE BUILDER FORM (ONLY WHEN ADDING NEW STAGE) */}
            {isStageFormOpen && !editingStageId && (
              <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      <FiLayers className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      Configure New Funnel Stage
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetStageForm}
                    className="h-8 px-2.5 rounded-lg inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-border/50 transition-all"
                  >
                    <FiX className="h-3.5 w-3.5 mr-1" /> Close
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Row 1: Template & Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldGuide
                        label="Standard Funnel Stage"
                        hint="Select a standard funnel progression template (Top, Middle, Bottom of funnel) or configure a custom milestone."
                        example="Awareness (01), Consideration (02), Lead Generation (03), Sales Conversion (05)"
                      />
                      <select
                        value={stagePreset}
                        onChange={(e) => handleSelectPreset(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      >
                        <option value="">-- Choose a standard funnel stage --</option>
                        {STAGE_PRESETS.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.label}
                          </option>
                        ))}
                        <option value="Custom Stage">Custom Stage</option>
                      </select>
                    </div>

                    <div>
                      <FieldGuide
                        label="Stage Name"
                        required
                        hint="The descriptive title of this milestone in your prospect's lifecycle."
                        example="Awareness, Consideration, Lead Gen, Demo Booking, Won Deal"
                      />
                      <input
                        type="text"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        placeholder="e.g. Awareness, Consideration, Lead Gen"
                        className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 2: Strategic Objective */}
                  <div>
                    <FieldGuide
                      label="Stage Strategic Objective"
                      hint="What qualitative milestone must occur at this stage before a prospect is qualified to advance?"
                      example="Build broad brand reach, educate factory owners on industry waste, and drive content discovery."
                    />
                    <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                      <RichTextEditor
                        value={stageObjective}
                        onChange={setStageObjective}
                        placeholder="What is the key goal of this stage in the customer journey? e.g. Drive problem engagement and demo requests..."
                        minHeight="65px"
                      />
                    </div>
                  </div>

                  {/* Row 3: Linked Marketing Campaigns (Dropdown only) */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldGuide
                        label={`Linked Marketing Campaigns (${stageCampaigns.length} assigned)`}
                        hint="Assign specific omnichannel campaigns that feed traffic and prospect touches into this stage."
                        example="Meta Lead Ads, Google Search Ads, LinkedIn InMail, Email Drip Sequences"
                      />
                      {stageCampaigns.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStageCampaigns([])}
                          className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Dropdown to pick standard campaign */}
                    <div>
                      <select
                        value={selectedCampaignToAdd}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddCampaignToStage(e.target.value);
                          }
                        }}
                        className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      >
                        <option value="">+ Click to choose & assign campaign...</option>
                        {AVAILABLE_CAMPAIGNS.map((cmp) => (
                          <option key={cmp} value={cmp} disabled={stageCampaigns.includes(cmp)}>
                            {cmp} {stageCampaigns.includes(cmp) ? "(Added)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Campaign Tags */}
                    {stageCampaigns.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {stageCampaigns.map((cmp) => (
                          <span
                            key={cmp}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          >
                            <span>{cmp}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCampaignFromStage(cmp)}
                              className="hover:text-rose-500 transition-colors"
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        No campaigns linked yet. Choose from the dropdown above to add campaigns to this stage.
                      </p>
                    )}
                  </div>

                  {/* Row 4: Budget & KPI Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <FieldGuide
                        label="Planned Stage Budget (৳)"
                        hint="The planned marketing spend allocated to run ads, production, and sponsorships for this stage."
                        example="50000"
                      />
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground">৳</span>
                        <input
                          type="number"
                          value={stageBudget}
                          onChange={(e) => setStageBudget(e.target.value)}
                          placeholder="e.g. 50000"
                          className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-border/80 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldGuide
                        label="Main KPI Metric Name"
                        hint="The core performance metric used to evaluate whether this stage is succeeding."
                        example="Reach, Clicks, Qualified Leads, Demo Bookings, Won Deals"
                      />
                      <input
                        type="text"
                        value={stageKPI}
                        onChange={(e) => setStageKPI(e.target.value)}
                        placeholder="e.g. Reach, Leads, SQLs, Demo Bookings"
                        className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      />
                    </div>

                    <div>
                      <FieldGuide
                        label="Target Quantity / Benchmark"
                        hint="The numeric volume or benchmark threshold you expect to achieve in this stage."
                        example="50,000 Impressions, 1,000 Leads, 25% Stage Conversion"
                      />
                      <input
                        type="text"
                        value={stageKPITarget}
                        onChange={(e) => setStageKPITarget(e.target.value)}
                        placeholder="e.g. 50,000 Views, 1,000 Leads"
                        className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetStageForm}
                      className="h-9 px-4 text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveStage}
                      className="h-9 px-5 text-xs font-semibold shadow-xs"
                    >
                      <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                      Save Stage to Funnel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIGURED STAGES PIPELINE (CARDS WITH INLINE EXPANDABLE EDITING) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-500 h-4 w-4" />
                  <span>Configured Funnel Pipeline ({stages.length} Stages)</span>
                </h3>
                <div className="flex items-center gap-2">
                  {stages.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyDefaultBlueprint}
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      <FiZap className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Apply 5-Stage Template
                    </Button>
                  )}
                  {!isStageFormOpen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleResetStageForm();
                        setIsStageFormOpen(true);
                      }}
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      <FiPlus className="mr-1 h-3.5 w-3.5" /> Add Stage
                    </Button>
                  )}
                </div>
              </div>

              {stages.length === 0 && !isStageFormOpen ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                    <FiLayers className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">No Funnel Stages Added Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Click &quot;Add New Stage&quot; to build custom stages or apply standard 5-stage blueprint template.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleResetStageForm();
                        setIsStageFormOpen(true);
                      }}
                      className="h-9 px-4 text-xs font-semibold shadow-xs"
                    >
                      <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Add New Stage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyDefaultBlueprint}
                      className="h-9 px-4 text-xs font-semibold"
                    >
                      <FiZap className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> 1-Click 5-Stage Template
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {stages.map((stg) => {
                    const isEditing = editingStageId === stg.id;
                    return (
                      <div
                        key={stg.id}
                        className={`rounded-2xl border transition-all ${
                          isEditing
                            ? "border-primary/60 bg-card p-5 shadow-sm space-y-4 ring-2 ring-primary/20"
                            : "border-border/60 bg-card p-5 shadow-2xs space-y-3 hover:border-border"
                        }`}
                      >
                        {/* Top Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              0{stg.position}
                            </span>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-foreground">{stg.name}</h4>
                                {isEditing && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5"
                                  >
                                    Editing Stage
                                  </Badge>
                                )}
                              </div>
                              {!isEditing && stg.objective && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{stg.objective}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isEditing && stg.plannedBudget > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs font-mono text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                              >
                                ৳{stg.plannedBudget.toLocaleString()}
                              </Badge>
                            )}
                            {!isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditStage(stg)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all shadow-2xs"
                                  title="Edit Stage"
                                >
                                  <FiEdit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStage(stg.id)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 border border-border/50 hover:border-rose-500/30 transition-all shadow-2xs"
                                  title="Delete Stage"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResetStageForm}
                                className="h-7 px-2.5 rounded-lg inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-border/50 transition-all"
                              >
                                <FiX className="h-3.5 w-3.5 mr-1" /> Close
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Non-editing View: Summary KPI & Campaign tags */}
                        {!isEditing && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                            {stg.mainKPI ? (
                              <span className="text-[11px] text-muted-foreground font-semibold">
                                Target KPI: <span className="text-foreground">{stg.mainKPI}</span> {stg.kpiTarget ? `(${stg.kpiTarget})` : ""}
                              </span>
                            ) : (
                              <span />
                            )}

                            {stg.selectedCampaigns && stg.selectedCampaigns.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 ml-auto">
                                {stg.selectedCampaigns.map((cmp) => (
                                  <Badge
                                    key={cmp}
                                    variant="secondary"
                                    className="text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                  >
                                    {cmp}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inline Expandable Edit View (Opens downwards directly inside this card) */}
                        {isEditing && (
                          <div className="space-y-4 pt-3 border-t border-border/40 animate-in fade-in-50 duration-200">
                            {/* Row 1: Template & Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <FieldGuide
                                  label="Standard Funnel Stage"
                                  hint="Select a standard funnel progression template (Top, Middle, Bottom of funnel) or configure a custom milestone."
                                  example="Awareness (01), Consideration (02), Lead Generation (03), Sales Conversion (05)"
                                />
                                <select
                                  value={stagePreset}
                                  onChange={(e) => handleSelectPreset(e.target.value)}
                                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                  <option value="">-- Choose a standard funnel stage --</option>
                                  {STAGE_PRESETS.map((p) => (
                                    <option key={p.name} value={p.name}>
                                      {p.label}
                                    </option>
                                  ))}
                                  <option value="Custom Stage">Custom Stage</option>
                                </select>
                              </div>

                              <div>
                                <FieldGuide
                                  label="Stage Name"
                                  required
                                  hint="The descriptive title of this milestone in your prospect's lifecycle."
                                  example="Awareness, Consideration, Lead Gen, Demo Booking, Won Deal"
                                />
                                <input
                                  type="text"
                                  value={stageName}
                                  onChange={(e) => setStageName(e.target.value)}
                                  placeholder="e.g. Awareness, Consideration, Lead Gen"
                                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                />
                              </div>
                            </div>

                            {/* Row 2: Strategic Objective */}
                            <div>
                              <FieldGuide
                                label="Stage Strategic Objective"
                                hint="What qualitative milestone must occur at this stage before a prospect is qualified to advance?"
                                example="Build broad brand reach, educate factory owners on industry waste, and drive content discovery."
                              />
                              <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                                <RichTextEditor
                                  value={stageObjective}
                                  onChange={setStageObjective}
                                  placeholder="What is the key goal of this stage in the customer journey? e.g. Drive problem engagement and demo requests..."
                                  minHeight="65px"
                                />
                              </div>
                            </div>

                            {/* Row 3: Linked Marketing Campaigns */}
                            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                              <div className="flex items-center justify-between">
                                <FieldGuide
                                  label={`Linked Marketing Campaigns (${stageCampaigns.length} assigned)`}
                                  hint="Assign specific omnichannel campaigns that feed traffic and prospect touches into this stage."
                                  example="Meta Lead Ads, Google Search Ads, LinkedIn InMail, Email Drip Sequences"
                                />
                                {stageCampaigns.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setStageCampaigns([])}
                                    className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors"
                                  >
                                    Clear all
                                  </button>
                                )}
                              </div>

                              {/* Dropdown to pick standard campaign */}
                              <div>
                                <select
                                  value={selectedCampaignToAdd}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddCampaignToStage(e.target.value);
                                    }
                                  }}
                                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                  <option value="">+ Click to choose & assign campaign...</option>
                                  {AVAILABLE_CAMPAIGNS.map((cmp) => (
                                    <option key={cmp} value={cmp} disabled={stageCampaigns.includes(cmp)}>
                                      {cmp} {stageCampaigns.includes(cmp) ? "(Added)" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Selected Campaign Tags */}
                              {stageCampaigns.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {stageCampaigns.map((cmp) => (
                                    <span
                                      key={cmp}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                    >
                                      <span>{cmp}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCampaignFromStage(cmp)}
                                        className="hover:text-rose-500 transition-colors"
                                      >
                                        <FiX className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground italic">
                                  No campaigns linked yet. Choose from the dropdown above to add campaigns to this stage.
                                </p>
                              )}
                            </div>

                            {/* Row 4: Budget & KPI Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <FieldGuide
                                  label="Planned Stage Budget (৳)"
                                  hint="The planned marketing spend allocated to run ads, production, and sponsorships for this stage."
                                  example="50000"
                                />
                                <div className="relative">
                                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground">৳</span>
                                  <input
                                    type="number"
                                    value={stageBudget}
                                    onChange={(e) => setStageBudget(e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-border/80 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                  />
                                </div>
                              </div>

                              <div>
                                <FieldGuide
                                  label="Main KPI Metric Name"
                                  hint="The core performance metric used to evaluate whether this stage is succeeding."
                                  example="Reach, Clicks, Qualified Leads, Demo Bookings, Won Deals"
                                />
                                <input
                                  type="text"
                                  value={stageKPI}
                                  onChange={(e) => setStageKPI(e.target.value)}
                                  placeholder="e.g. Reach, Leads, SQLs, Demo Bookings"
                                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                />
                              </div>

                              <div>
                                <FieldGuide
                                  label="Target Quantity / Benchmark"
                                  hint="The numeric volume or benchmark threshold you expect to achieve in this stage."
                                  example="50,000 Impressions, 1,000 Leads, 25% Stage Conversion"
                                />
                                <input
                                  type="text"
                                  value={stageKPITarget}
                                  onChange={(e) => setStageKPITarget(e.target.value)}
                                  placeholder="e.g. 50,000 Views, 1,000 Leads"
                                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                />
                              </div>
                            </div>

                            {/* Action Bar inside Card */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetStageForm}
                                className="h-9 px-4 text-xs font-semibold"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveStage}
                                className="h-9 px-5 text-xs font-semibold shadow-xs"
                              >
                                <FiCheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                Update Stage
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: EXECUTION PLAN                                   */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FiPieChart className="text-primary h-5 w-5" />
                Step 4 — Execution Plan & Channels
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Select marketing channels, content pillars, timeline and funnel ownership.
              </p>
            </div>

            {/* CHANNELS */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <FieldGuide
                  label={`1. Marketing Channels (${selectedChannels.length} Selected)`}
                  hint="Select all the digital and offline channels through which this funnel's campaigns will be distributed."
                  example="Facebook, LinkedIn, Google Search, Email, WhatsApp, Events"
                />
                {selectedChannels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedChannels([])}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {channelOptions.map((ch) => {
                  const isSelected = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() =>
                        setSelectedChannels(
                          isSelected
                            ? selectedChannels.filter((c) => c !== ch)
                            : [...selectedChannels, ch]
                        )
                      }
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/60 bg-background/50 text-foreground hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{ch}</span>
                        {isSelected && <FiCheckCircle className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONTENT PILLARS */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
              <div className="border-b border-border/40 pb-2">
                <FieldGuide
                  label="2. Content Strategy & Pillars"
                  hint="The 3-5 core educational themes and thought leadership topics your team will create across channels."
                  example="1) RMG Floor Efficiency, 2) Bengali Payroll Compliance, 3) Real-time Order Tracking Case Studies"
                />
              </div>
              <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-2">
                <RichTextEditor
                  value={contentPillars}
                  onChange={setContentPillars}
                  placeholder="Outline key content pillars: e.g. 1) RMG Floor Efficiency, 2) Bengali Payroll Compliance, 3) Real-time Order Tracking Case Studies..."
                  minHeight="85px"
                />
              </div>
            </div>

            {/* BUDGET & TIMELINE */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
                3. Budget Envelope & Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FieldGuide
                    label="Approved Budget Envelope (৳)"
                    hint="Total authorized monetary budget approved by management for executing this strategic marketing funnel."
                    example="500000"
                  />
                  <input
                    type="number"
                    value={approvedBudget}
                    onChange={(e) => setApprovedBudget(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background font-mono text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <FieldGuide
                    label="Start Date"
                    hint="The official launch date when campaigns under this funnel begin active distribution."
                  />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <FieldGuide
                    label="End Date"
                    hint="The target deadline when final funnel conversion metrics and revenue attribution are reviewed."
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* GOAL & OWNER */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
                4. Tracking & Team Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldGuide
                    label="Main Conversion Goal"
                    hint="The ultimate conversion milestone that signifies this funnel has achieved its primary mission."
                    example="100 Enterprise Factory Contract Signatures"
                  />
                  <input
                    type="text"
                    value={mainConversionGoal}
                    onChange={(e) => setMainConversionGoal(e.target.value)}
                    placeholder="e.g. 100 Enterprise Factory Contract Signatures"
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <FieldGuide
                    label="Funnel Owner"
                    hint="The primary team member or marketing manager responsible for driving execution and hitting targets."
                  />
                  <select
                    value={funnelOwner}
                    onChange={(e) => setFunnelOwner(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  >
                    <option value="">-- Select Funnel Owner from Users --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} {u.role ? `(${u.role.toUpperCase()})` : ""} {u.email ? `— ${u.email}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: REVIEW & CREATE                                  */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-border/40 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FiCheckCircle className="text-primary h-5 w-5" />
                Step 5 — Final Blueprint Review & Creation
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Review your marketing funnel configuration before saving or launching.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Funnel Name
                  </span>
                  <p className="font-bold text-foreground text-sm mt-1">
                    {name || <span className="text-muted-foreground italic">Untitled Funnel</span>}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Product / Service
                  </span>
                  <p className="font-bold text-foreground text-sm mt-1">
                    {productName || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Target Revenue Goal
                  </span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-1">
                    ৳{parseInt(targetRevenue || "0").toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Approved Budget Envelope
                  </span>
                  <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm mt-1">
                    ৳{totalApproved.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Funnel Owner
                  </span>
                  <p className="font-bold text-foreground text-sm mt-1 truncate">
                    {funnelOwner || <span className="text-muted-foreground italic">Unassigned</span>}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                    Main Conversion Goal
                  </span>
                  <p className="font-bold text-foreground text-sm mt-1 truncate">
                    {mainConversionGoal || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                </div>
              </div>

              {/* CONFIGURED STAGES */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Configured Stages ({stages.length})
                </span>
                {stages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No stages configured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stages.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border/40 bg-background/50 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            0{s.position}. {s.name}
                          </span>
                          <span className="font-mono text-muted-foreground font-bold">
                            ৳{s.plannedBudget.toLocaleString()}
                          </span>
                        </div>
                        {s.selectedCampaigns && s.selectedCampaigns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.selectedCampaigns.map((cmp) => (
                              <span
                                key={cmp}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                              >
                                {cmp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToStep(4)}
                className="h-10 px-4"
              >
                <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateSubmit(true)}
                  className="h-10 px-4 font-semibold"
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleCreateSubmit(false)}
                  className="h-10 px-6 font-semibold shadow-xs"
                >
                  {isSubmitting ? "Creating..." : "Create Marketing Funnel"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP NAVIGATION BUTTONS (FOR STEPS 1-4) */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              disabled={currentStep === 1}
              onClick={() => goToStep(currentStep - 1)}
              className="h-10 px-4 text-xs font-semibold"
            >
              <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Previous Step
            </Button>

            <Button
              size="sm"
              onClick={() => goToStep(currentStep + 1)}
              className="h-10 px-6 text-xs font-semibold shadow-xs"
            >
              Next: {stepsList[currentStep]?.title || "Review"}{" "}
              <FiChevronRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
