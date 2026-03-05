'use client';

/**
 * QuotationSectionRenderer
 *
 * Loops through a flat `sections` array and renders each one inside a
 * `QuotationSectionCard` shell, dispatching to the correct leaf component
 * based on `sectionType`.
 *
 * All new section types (CLIENT_INFO, PROJECT_SUMMARY, etc.) read and write
 * their data through `section.metadata` — this keeps pricing logic, Item
 * models, and existing serialization completely untouched.
 */

import { useState, useCallback } from 'react';

import { SECTION_REGISTRY } from './sectionRegistry';
import { normalizeSectionMetadata } from '@/lib/quotation/normalizeSectionMetadata';

// Shell

import { QuotationSectionCard } from './builder/QuotationSectionCard';
import type { SectionType } from './builder/SectionTypeIcon';

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

// ── Section shape ─────────────────────────────────────────────────────────────

export interface RendererSection {
  id: string;
  title: string;
  sectionType: SectionType;
  isEnabled?: boolean;

  // ── PRICING fields (unchanged) ────────────────────────────────────────────
  items?: any[];
  groups?: any[];
  categoryGroups?: any[];
  discount?: number;
  total?: number;
  grandTotal?: number;
  sortOrder?: number;
  categoryId?: string | null;

  // ── Legacy COVER fields ───────────────────────────────────────────────────
  coverTitle?: string;
  coverIntro?: string;
  subject?: string;
  coverLetter?: string;
  preparedBy?: string;
  validUntil?: string;

  // ── Legacy SUMMARY fields ─────────────────────────────────────────────────
  projectOverview?: string;
  financialStatement?: string;

  // ── Legacy TERMS / PAYMENT_TERMS ─────────────────────────────────────────
  tos?: string;
  paymentTerms?: string;
  refundPolicy?: string;
  terminationPolicy?: string;
  content?: string;
  note?: string;

  // ── Legacy TIMELINE fields ────────────────────────────────────────────────
  milestones?: Array<{ id: string; label: string; duration?: string; startDate?: string }>;

  // ── Legacy ACCEPTANCE fields ──────────────────────────────────────────────
  acceptanceText?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureDate?: string;
  signatureDataUrl?: string;

  /**
   * All new section types store their structured data here.
   * Shape is dictated by the individual section component.
   */
  metadata?: Record<string, any>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface QuotationSectionRendererProps {
  sections: RendererSection[];
  onUpdateSection: (updatedSection: RendererSection) => void;
  readOnly?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getContent(section: RendererSection): string {
  return section.content ?? section.note ?? '';
}

// ── Leaf dispatcher ───────────────────────────────────────────────────────────

function SectionContent({
  section,
  onUpdate,
  readOnly,
}: {
  section: RendererSection;
  onUpdate: (patch: Partial<RendererSection>) => void;
  readOnly: boolean;
}) {
  /** Helper to read/write structured data from metadata under a given key. */
  const normalizedMetadata = normalizeSectionMetadata(section.sectionType, section.metadata);
  const metaData = (key: string) => normalizedMetadata[key] ?? {};
  const updateMeta = (key: string, value: any) => onUpdate({ metadata: { ...(section.metadata || {}), [key]: value } });
  const getContent = (sec: RendererSection) => sec.content ?? sec.note ?? '';

  const config = SECTION_REGISTRY[section.sectionType as SectionType] || SECTION_REGISTRY.CUSTOM;
  const Component = config.component;

  return (
    <Component
      section={section}
      onUpdate={onUpdate}
      readOnly={readOnly}
      metaData={metaData}
      updateMeta={updateMeta}
      getContent={getContent}
    />
  );
}
