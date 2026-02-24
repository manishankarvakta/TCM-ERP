'use client';

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
} from 'lucide-react';

// ── SectionType union ─────────────────────────────────────────────────────────
export type SectionType =
  // Core proposal sections
  | 'COVER'
  | 'CLIENT_INFO'
  | 'PROJECT_SUMMARY'
  | 'SCOPE'
  | 'TIMELINE'
  | 'PRICING'
  | 'PAYMENT_TERMS'
  | 'LEGAL_TERMS'
  | 'ACCEPTANCE'
  // Optional library sections
  | 'EXECUTIVE_SUMMARY'
  | 'COMPANY_OVERVIEW'
  | 'TECHNICAL_APPROACH'
  | 'ARCHITECTURE_OVERVIEW'
  | 'TEAM_STRUCTURE'
  | 'ASSUMPTIONS'
  | 'RISK_ASSESSMENT'
  | 'SUPPORT_SLA'
  | 'APPENDIX'
  // Legacy (backward compat)
  | 'SUMMARY'
  | 'TERMS'
  | 'CUSTOM';

interface SectionTypeMeta {
  icon: React.ElementType;
  label: string;
  color: string;     // tailwind bg class for the icon badge
  textColor: string; // tailwind text class
}

export const SECTION_TYPE_META: Record<SectionType, SectionTypeMeta> = {
  // ── Core ──────────────────────────────────────────────────────────────────
  COVER: {
    icon: FileText,
    label: 'Cover',
    color: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  CLIENT_INFO: {
    icon: User,
    label: 'Client Info',
    color: 'bg-cyan-100 dark:bg-cyan-900/40',
    textColor: 'text-cyan-700 dark:text-cyan-300',
  },
  PROJECT_SUMMARY: {
    icon: FolderOpen,
    label: 'Project Summary',
    color: 'bg-violet-100 dark:bg-violet-900/40',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  SCOPE: {
    icon: Target,
    label: 'Scope',
    color: 'bg-teal-100 dark:bg-teal-900/40',
    textColor: 'text-teal-700 dark:text-teal-300',
  },
  TIMELINE: {
    icon: Clock,
    label: 'Timeline',
    color: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  PRICING: {
    icon: DollarSign,
    label: 'Pricing',
    color: 'bg-emerald-100 dark:bg-emerald-900/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  PAYMENT_TERMS: {
    icon: CreditCard,
    label: 'Payment Terms',
    color: 'bg-orange-100 dark:bg-orange-900/40',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
  LEGAL_TERMS: {
    icon: Scale,
    label: 'Legal Terms',
    color: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  ACCEPTANCE: {
    icon: PenSquare,
    label: 'Acceptance',
    color: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-700 dark:text-purple-300',
  },

  // ── Optional library ──────────────────────────────────────────────────────
  EXECUTIVE_SUMMARY: {
    icon: Lightbulb,
    label: 'Executive Summary',
    color: 'bg-yellow-100 dark:bg-yellow-900/40',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  COMPANY_OVERVIEW: {
    icon: Building2,
    label: 'Company Overview',
    color: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  TECHNICAL_APPROACH: {
    icon: Cpu,
    label: 'Technical Approach',
    color: 'bg-sky-100 dark:bg-sky-900/40',
    textColor: 'text-sky-700 dark:text-sky-300',
  },
  ARCHITECTURE_OVERVIEW: {
    icon: Network,
    label: 'Architecture',
    color: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  TEAM_STRUCTURE: {
    icon: Users,
    label: 'Team Structure',
    color: 'bg-pink-100 dark:bg-pink-900/40',
    textColor: 'text-pink-700 dark:text-pink-300',
  },
  ASSUMPTIONS: {
    icon: BookOpen,
    label: 'Assumptions',
    color: 'bg-lime-100 dark:bg-lime-900/40',
    textColor: 'text-lime-700 dark:text-lime-300',
  },
  RISK_ASSESSMENT: {
    icon: AlertTriangle,
    label: 'Risk Assessment',
    color: 'bg-red-100 dark:bg-red-900/40',
    textColor: 'text-red-700 dark:text-red-300',
  },
  SUPPORT_SLA: {
    icon: Headphones,
    label: 'Support & SLA',
    color: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    textColor: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
  APPENDIX: {
    icon: Paperclip,
    label: 'Appendix',
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
  },

  // ── Legacy ────────────────────────────────────────────────────────────────
  SUMMARY: {
    icon: BarChart2,
    label: 'Summary',
    color: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  TERMS: {
    icon: FileCheck,
    label: 'Terms',
    color: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  CUSTOM: {
    icon: Layout,
    label: 'Custom',
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
};

interface SectionTypeIconProps {
  type: SectionType;
  showLabel?: boolean;
  className?: string;
}

export function SectionTypeBadge({ type, showLabel = true, className = '' }: SectionTypeIconProps) {
  const meta = SECTION_TYPE_META[type] ?? SECTION_TYPE_META.CUSTOM;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color} ${meta.textColor} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
