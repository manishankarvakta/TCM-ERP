import React, { ReactNode } from 'react';
import type { RendererSection } from './QuotationSectionRenderer';
import type { SectionType } from './builder/SectionTypeIcon';
import { SectionType as PrismaSectionType } from '@prisma/client';

import {
  FileText,
  BarChart2,
  DollarSign,
  Clock,
  CreditCard,
  FileCheck,
  PenSquare,
  Layout,
  User,
  FolderOpen,
  Target,
  Lightbulb,
  Building2,
  Cpu,
  Network,
  Users,
  AlertTriangle,
  Headphones,
  Paperclip,
  Scale,
  BookOpen,
  LucideIcon,
} from 'lucide-react';

// Existing leaf components
import { QuotationItemsArea } from '@/components/quotation/QuotationItemsArea';
import { CoverSection }        from '@/components/quotation/sections/CoverSection';
import { SummarySection }      from '@/components/quotation/sections/SummarySection';
import { AcceptanceSection }   from '@/components/quotation/sections/AcceptanceSection';
import { TimelineSection }     from '@/components/quotation/sections/TimelineSection';
import { TermsSection }        from '@/components/quotation/sections/TermsSection';
import { RichTextSection }     from '@/components/quotation/sections/RichTextSection';

// New metadata-driven section components
import { ClientInfoSection }          from '@/components/quotation/sections/ClientInfoSection';
import { ProjectSummarySection }      from '@/components/quotation/sections/ProjectSummarySection';
import { ScopeSection }               from '@/components/quotation/sections/ScopeSection';
import { PaymentTermsSection }        from '@/components/quotation/sections/PaymentTermsSection';
import { LegalTermsSection }          from '@/components/quotation/sections/LegalTermsSection';
import { ExecutiveSummarySection }    from '@/components/quotation/sections/ExecutiveSummarySection';
import { CompanyOverviewSection }     from '@/components/quotation/sections/CompanyOverviewSection';
import { TechnicalApproachSection }   from '@/components/quotation/sections/TechnicalApproachSection';
import { ArchitectureOverviewSection }from '@/components/quotation/sections/ArchitectureOverviewSection';
import { TeamStructureSection }       from '@/components/quotation/sections/TeamStructureSection';
import { AssumptionsSection }         from '@/components/quotation/sections/AssumptionsSection';
import { RiskAssessmentSection }      from '@/components/quotation/sections/RiskAssessmentSection';
import { SupportSLASection }          from '@/components/quotation/sections/SupportSLASection';
import { AppendixSection }            from '@/components/quotation/sections/AppendixSection';

export interface SectionRenderProps {
  section: RendererSection;
  onUpdate: (patch: Partial<RendererSection>) => void;
  readOnly: boolean;
  metaData: (key: string) => any;
  updateMeta: (key: string, value: any) => void;
  getContent: (section: RendererSection) => string;
}

export type SectionMode = 'TEMPLATE' | 'INPUT' | 'GENERATED' | 'TABLE' | 'PRICING';

export type SectionConfig<T extends SectionType = SectionType> = {
  sectionType: T;
  label: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
  accentColor: string;
  mode: SectionMode;
  defaultMetadata: Record<string, any>;
  component: React.FC<SectionRenderProps> | ((props: SectionRenderProps) => ReactNode);
};

export const SECTION_REGISTRY: Record<SectionType, SectionConfig> = {
  // ── PRICING ───────────────────────────────────────────────────────────────────
  PRICING: {
    sectionType: 'PRICING',
    label: 'Pricing',
    icon: DollarSign,
    color: 'bg-emerald-100 dark:bg-emerald-900/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    accentColor: 'border-l-emerald-400 dark:border-l-emerald-500',
    mode: 'PRICING',
    defaultMetadata: {},
    component: ({ section, onUpdate }: SectionRenderProps) => (
      <QuotationItemsArea
        sections={[section as any]}
        onSectionsChange={(updated: any[]) => { if (updated[0]) onUpdate(updated[0]); }}
      />
    )
  },

  // ── COVER ─────────────────────────────────────────────────────────────────
  COVER: {
    sectionType: 'COVER',
    label: 'Cover',
    icon: FileText,
    color: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    accentColor: 'border-l-blue-400 dark:border-l-blue-500',
    mode: 'TEMPLATE',
    defaultMetadata: {},
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <CoverSection
        data={{ 
          subject: (section as any).subject, 
          coverLetter: (section as any).coverLetter, 
          preparedBy: (section as any).preparedBy, 
          validUntil: (section as any).validUntil 
        }}
        onChange={(data: any) => onUpdate(data)}
        readOnly={readOnly}
      />
    )
  },

  // ── CLIENT_INFO ───────────────────────────────────────────────────────────
  CLIENT_INFO: {
    sectionType: 'CLIENT_INFO',
    label: 'Client Info',
    icon: User,
    color: 'bg-cyan-100 dark:bg-cyan-900/40',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    accentColor: 'border-l-cyan-400 dark:border-l-cyan-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <ClientInfoSection data={metaData('clientInfo')} onChange={(d: any) => updateMeta('clientInfo', d)} readOnly={readOnly} />
    )
  },

  // ── PROJECT_SUMMARY ───────────────────────────────────────────────────────
  PROJECT_SUMMARY: {
    sectionType: 'PROJECT_SUMMARY',
    label: 'Project Summary',
    icon: FolderOpen,
    color: 'bg-violet-100 dark:bg-violet-900/40',
    textColor: 'text-violet-700 dark:text-violet-300',
    accentColor: 'border-l-indigo-400 dark:border-l-indigo-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <ProjectSummarySection data={metaData('projectSummary')} onChange={(d: any) => updateMeta('projectSummary', d)} readOnly={readOnly} />
    )
  },

  // ── SCOPE ─────────────────────────────────────────────────────────────────
  SCOPE: {
    sectionType: 'SCOPE',
    label: 'Scope',
    icon: Target,
    color: 'bg-teal-100 dark:bg-teal-900/40',
    textColor: 'text-teal-700 dark:text-teal-300',
    accentColor: 'border-l-teal-400 dark:border-l-teal-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <ScopeSection data={metaData('scope')} onChange={(d: any) => updateMeta('scope', d)} readOnly={readOnly} />
    )
  },

  // ── TIMELINE ─────────────────────────────────────────────────────────────
  TIMELINE: {
    sectionType: 'TIMELINE',
    label: 'Timeline',
    icon: Clock,
    color: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    accentColor: 'border-l-amber-400 dark:border-l-amber-500',
    mode: 'TABLE',
    defaultMetadata: {
      milestones: []
    },
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <TimelineSection milestones={(section as any).milestones ?? []} onChange={(milestones: any) => onUpdate({ milestones: milestones as any })} readOnly={readOnly} />
    )
  },

  // ── LEGAL_TERMS ───────────────────────────────────────────────────────────
  LEGAL_TERMS: {
    sectionType: 'LEGAL_TERMS',
    label: 'Terms and Conditions',
    icon: Scale,
    color: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    accentColor: 'border-l-rose-400 dark:border-l-rose-500',
    mode: 'TEMPLATE',
    defaultMetadata: {
      tos: '',
      paymentTerms: '',
      refundPolicy: '',
      terminationPolicy: ''
    },
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <TermsSection
        data={{ 
          tos: (section as any).tos ?? (section as any).content ?? (section as any).metadata?.tos ?? '',
          paymentTerms: (section as any).paymentTerms ?? (section as any).metadata?.paymentTerms ?? '',
          refundPolicy: (section as any).metadata?.refundPolicy ?? '',
          terminationPolicy: (section as any).metadata?.terminationPolicy ?? '',
        }}
        onChange={(data: any) => onUpdate({ 
          tos: data.tos, 
          paymentTerms: data.paymentTerms,
          refundPolicy: data.refundPolicy,
          terminationPolicy: data.terminationPolicy,
          content: data.tos, 
          metadata: { 
            ...(section.metadata || {}),
            tos: data.tos,
            paymentTerms: data.paymentTerms,
            refundPolicy: data.refundPolicy,
            terminationPolicy: data.terminationPolicy
          } 
        })}
        readOnly={readOnly}
      />
    )
  },

  // ── ACCEPTANCE ────────────────────────────────────────────────────────────
  ACCEPTANCE: {
    sectionType: 'ACCEPTANCE',
    label: 'Acceptance',
    icon: PenSquare,
    color: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-700 dark:text-purple-300',
    accentColor: 'border-l-purple-400 dark:border-l-purple-500',
    mode: 'TEMPLATE',
    defaultMetadata: {},
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <AcceptanceSection
        data={{ 
          acceptanceText: (section as any).acceptanceText, 
          signatoryName: (section as any).signatoryName, 
          signatoryDesignation: (section as any).signatoryDesignation, 
          signatureDate: (section as any).signatureDate, 
          signatureDataUrl: (section as any).signatureDataUrl 
        }}
        onChange={(data: any) => onUpdate(data)}
        readOnly={readOnly}
      />
    )
  },

  // ── EXECUTIVE_SUMMARY ─────────────────────────────────────────────────────
  EXECUTIVE_SUMMARY: {
    sectionType: 'EXECUTIVE_SUMMARY',
    label: 'Executive Summary',
    icon: Lightbulb,
    color: 'bg-yellow-100 dark:bg-yellow-900/40',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    accentColor: 'border-l-violet-400 dark:border-l-violet-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <ExecutiveSummarySection data={metaData('executiveSummary')} onChange={(d: any) => updateMeta('executiveSummary', d)} readOnly={readOnly} />
    )
  },

  // ── COMPANY_OVERVIEW ──────────────────────────────────────────────────────
  COMPANY_OVERVIEW: {
    sectionType: 'COMPANY_OVERVIEW',
    label: 'Company Overview',
    icon: Building2,
    color: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    accentColor: 'border-l-sky-400 dark:border-l-sky-500',
    mode: 'TEMPLATE',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <CompanyOverviewSection data={metaData('companyOverview')} onChange={(d: any) => updateMeta('companyOverview', d)} readOnly={readOnly} />
    )
  },

  // ── TECHNICAL_APPROACH ────────────────────────────────────────────────────
  TECHNICAL_APPROACH: {
    sectionType: 'TECHNICAL_APPROACH',
    label: 'Technical Approach',
    icon: Cpu,
    color: 'bg-sky-100 dark:bg-sky-900/40',
    textColor: 'text-sky-700 dark:text-sky-300',
    accentColor: 'border-l-lime-400 dark:border-l-lime-500',
    mode: 'GENERATED',
    defaultMetadata: {
      languages: [],
      frontend: [],
      backend: [],
      database: [],
      server: []
    },
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <TechnicalApproachSection data={metaData('technicalApproach')} onChange={(d: any) => updateMeta('technicalApproach', d)} readOnly={readOnly} />
    )
  },

  // ── ARCHITECTURE_OVERVIEW ─────────────────────────────────────────────────
  ARCHITECTURE_OVERVIEW: {
    sectionType: 'ARCHITECTURE_OVERVIEW',
    label: 'Architecture',
    icon: Network,
    color: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    accentColor: 'border-l-fuchsia-400 dark:border-l-fuchsia-500',
    mode: 'GENERATED',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <ArchitectureOverviewSection data={metaData('architectureOverview')} onChange={(d: any) => updateMeta('architectureOverview', d)} readOnly={readOnly} />
    )
  },

  // ── TEAM_STRUCTURE ────────────────────────────────────────────────────────
  TEAM_STRUCTURE: {
    sectionType: 'TEAM_STRUCTURE',
    label: 'Team Structure',
    icon: Users,
    color: 'bg-pink-100 dark:bg-pink-900/40',
    textColor: 'text-pink-700 dark:text-pink-300',
    accentColor: 'border-l-pink-400 dark:border-l-pink-500',
    mode: 'TABLE',
    defaultMetadata: {
      members: []
    },
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <TeamStructureSection data={metaData('teamStructure')} onChange={(d: any) => updateMeta('teamStructure', d)} readOnly={readOnly} />
    )
  },

  // ── ASSUMPTIONS ───────────────────────────────────────────────────────────
  ASSUMPTIONS: {
    sectionType: 'ASSUMPTIONS',
    label: 'Assumptions',
    icon: BookOpen,
    color: 'bg-lime-100 dark:bg-lime-900/40',
    textColor: 'text-lime-700 dark:text-lime-300',
    accentColor: 'border-l-yellow-400 dark:border-l-yellow-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <AssumptionsSection data={metaData('assumptions')} onChange={(d: any) => updateMeta('assumptions', d)} readOnly={readOnly} />
    )
  },

  // ── RISK_ASSESSMENT ───────────────────────────────────────────────────────
  RISK_ASSESSMENT: {
    sectionType: 'RISK_ASSESSMENT',
    label: 'Risk Assessment',
    icon: AlertTriangle,
    color: 'bg-red-100 dark:bg-red-900/40',
    textColor: 'text-red-700 dark:text-red-300',
    accentColor: 'border-l-red-400 dark:border-l-red-500',
    mode: 'TABLE',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <RiskAssessmentSection data={metaData('riskAssessment')} onChange={(d: any) => updateMeta('riskAssessment', d)} readOnly={readOnly} />
    )
  },

  // ── SUPPORT_SLA ───────────────────────────────────────────────────────────
  SUPPORT_SLA: {
    sectionType: 'SUPPORT_SLA',
    label: 'Support & SLA',
    icon: Headphones,
    color: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    textColor: 'text-fuchsia-700 dark:text-fuchsia-300',
    accentColor: 'border-l-teal-400 dark:border-l-teal-500',
    mode: 'TEMPLATE',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <SupportSLASection data={metaData('supportSLA')} onChange={(d: any) => updateMeta('supportSLA', d)} readOnly={readOnly} />
    )
  },

  // ── APPENDIX ──────────────────────────────────────────────────────────────
  APPENDIX: {
    sectionType: 'APPENDIX',
    label: 'Appendix',
    icon: Paperclip,
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    accentColor: 'border-l-gray-400 dark:border-l-gray-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ metaData, updateMeta, readOnly }: SectionRenderProps) => (
      <AppendixSection data={metaData('appendix')} onChange={(d: any) => updateMeta('appendix', d)} readOnly={readOnly} />
    )
  },

  // ── SUMMARY (legacy) ──────────────────────────────────────────────────────
  SUMMARY: {
    sectionType: 'SUMMARY',
    label: 'Summary',
    icon: BarChart2,
    color: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    accentColor: 'border-l-indigo-400 dark:border-l-indigo-500',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <SummarySection
        data={{ projectOverview: (section as any).projectOverview, financialStatement: (section as any).financialStatement }}
        onChange={(data: any) => onUpdate(data)}
        readOnly={readOnly}
      />
    )
  },

  // ── TERMS (legacy) ────────────────────────────────────────────────────────
  TERMS: {
    sectionType: 'TERMS',
    label: 'Terms',
    icon: FileCheck,
    color: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    accentColor: 'border-l-slate-400 dark:border-l-slate-500',
    mode: 'TEMPLATE',
    defaultMetadata: {
      tos: '',
      paymentTerms: '',
      refundPolicy: '',
      terminationPolicy: ''
    },
    component: ({ section, onUpdate, readOnly }: SectionRenderProps) => (
      <TermsSection
        data={{ 
          tos: (section as any).tos ?? (section as any).content ?? (section as any).metadata?.tos ?? '',
          paymentTerms: (section as any).metadata?.paymentTerms ?? '',
          refundPolicy: (section as any).metadata?.refundPolicy ?? '',
          terminationPolicy: (section as any).metadata?.terminationPolicy ?? '',
        }}
        onChange={(data: any) => onUpdate({ 
          tos: data.tos, 
          content: data.tos, 
          metadata: { 
            ...(section.metadata || {}),
            tos: data.tos,
            paymentTerms: data.paymentTerms,
            refundPolicy: data.refundPolicy,
            terminationPolicy: data.terminationPolicy
          } 
        })}
        readOnly={readOnly}
      />
    )
  },

  // ── CUSTOM / fallback ─────────────────────────────────────────────────────
  CUSTOM: {
    sectionType: 'CUSTOM',
    label: 'Custom',
    icon: Layout,
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    accentColor: 'border-l-gray-300 dark:border-l-gray-600',
    mode: 'INPUT',
    defaultMetadata: {},
    component: ({ section, onUpdate, readOnly, getContent }: SectionRenderProps) => (
      <RichTextSection
        content={getContent(section)}
        label="Section Content"
        placeholder="Enter custom content for this section…"
        onChange={(content: string) => onUpdate({ content, note: content })}
        readOnly={readOnly}
      />
    )
  }
};

/**
 * Validates that the SECTION_REGISTRY and Prisma SectionType enum are in sync.
 * This checks at runtime that:
 * - every DB sectionType exists in the registry
 * - every registry type exists in the enum.
 */
export function validateSectionRegistry() {
  const registryKeys = Object.keys(SECTION_REGISTRY);
  const prismaKeys = Object.values(PrismaSectionType);

  const missingInRegistry = prismaKeys.filter(key => !registryKeys.includes(key));
  const missingInPrisma = registryKeys.filter(key => !prismaKeys.includes(key as any));

  if (missingInRegistry.length > 0) {
    console.error(`Validation Error: Section types in Prisma but missing in registry: ${missingInRegistry.join(', ')}`);
  }

  if (missingInPrisma.length > 0) {
    console.error(`Validation Error: Section types in registry but missing in Prisma: ${missingInPrisma.join(', ')}`);
  }

  return { 
    isValid: missingInRegistry.length === 0 && missingInPrisma.length === 0,
    missingInRegistry, 
    missingInPrisma 
  };
}
