'use client';

/**
 * SectionRenderer
 *
 * Maps a `SectionType` value to the correct UI component.
 *
 * IMPORTANT: The PRICING path intentionally re-uses `QuotationItemsArea`
 * without ANY modifications so existing pricing logic is untouched.
 *
 * Mapping:
 *   PRICING        → QuotationItemsArea  (existing pricing UI, unmodified)
 *   COVER          → CoverSection        (cover editor)
 *   SUMMARY        → RichTextSection     (rich text)
 *   TIMELINE       → TimelineSection     (timeline / milestones)
 *   PAYMENT_TERMS  → RichTextSection     (rich text)
 *   TERMS          → RichTextSection     (rich text)
 *   ACCEPTANCE     → AcceptanceSection   (signature UI)
 *   CUSTOM         → RichTextSection     (rich text)
 */

import { QuotationItemsArea } from '@/components/quotation/QuotationItemsArea';
import { CoverSection, type CoverSectionData } from './sections/CoverSection';
import { RichTextSection } from './sections/RichTextSection';
import { TimelineSection, type TimelineMilestone } from './sections/TimelineSection';
import { AcceptanceSection, type AcceptanceData } from './sections/AcceptanceSection';
import { SummarySection } from './sections/SummarySection';
import { TermsSection } from './sections/TermsSection';
import { ClientInfoSection } from './sections/ClientInfoSection';
import { ProjectSummarySection } from './sections/ProjectSummarySection';
import { ScopeSection } from './sections/ScopeSection';
import { PaymentTermsSection } from './sections/PaymentTermsSection';
import { LegalTermsSection } from './sections/LegalTermsSection';
import { ExecutiveSummarySection } from './sections/ExecutiveSummarySection';
import { CompanyOverviewSection } from './sections/CompanyOverviewSection';
import { TechnicalApproachSection } from './sections/TechnicalApproachSection';
import { ArchitectureOverviewSection } from './sections/ArchitectureOverviewSection';
import { TeamStructureSection } from './sections/TeamStructureSection';
import { AssumptionsSection } from './sections/AssumptionsSection';
import { RiskAssessmentSection } from './sections/RiskAssessmentSection';
import { SupportSLASection } from './sections/SupportSLASection';
import { AppendixSection } from './sections/AppendixSection';

// ─── Re-export sub-component types for convenience ───────────────────────────
export type { CoverSectionData, TimelineMilestone, AcceptanceData };

// ─── SectionType — import from the single canonical source ─────────────────
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';
export type { SectionType };

// ─── Shared section shape (subset used by the renderer) ──────────────────────
export interface RendererSection {
  id?: string;
  sectionType: SectionType;
  title?: string | null;
  isEnabled?: boolean;
  displayOrder?: number;
  /** Free-form metadata blob stored as JSON in the DB */
  metadata?: Record<string, unknown> | null;

  /* --- PRICING-only fields (passed straight through to QuotationItemsArea) -- */
  sortOrder?: number;
  note?: string;
  discount?: number;
  total?: number;
  grandTotal?: number;
  categoryId?: string;
  items?: unknown[];
  groups?: unknown[];
  categoryGroups?: unknown[];
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SectionRendererProps {
  /**
   * The single section object to render.
   */
  section: RendererSection;

  /**
   * For PRICING sections: the full array of sections so QuotationItemsArea
   * can manage inter-section state (totals, etc.).  Pass all sections here.
   */
  allPricingSections?: unknown[];

  /**
   * Contacts associated with the currently selected client.
   * Useful for the Client Info section.
   */
  clientContacts?: any[];

  /**
   * Called when the section's data changes.
   *
   * For PRICING: the full sections array is returned.
   * For all others: only the updated section is returned.
   */
  onChange: (updated: RendererSection | unknown[]) => void;

  readOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read a typed value from the JSON metadata blob (or return a fallback). */
function meta<T>(section: RendererSection, key: string, fallback: T): T {
  if (!section.metadata) return fallback;
  const val = (section.metadata as Record<string, unknown>)[key];
  return (val as T) ?? fallback;
}

/** Merge a partial metadata update back onto the section. */
function withMeta(section: RendererSection, patch: Record<string, unknown>): RendererSection {
  return { ...section, metadata: { ...(section.metadata ?? {}), ...patch } };
}

// ─── Renderer ────────────────────────────────────────────────────────────────

export function SectionRenderer({
  section,
  allPricingSections,
  clientContacts,
  onChange,
  readOnly = false,
}: SectionRendererProps) {
  const type: SectionType = section.sectionType ?? 'CUSTOM';

  // ── PRICING ----------------------------------------------------------------
  // Delegate entirely to QuotationItemsArea; never decompose pricing logic here.
  if (type === 'PRICING') {
    const pricingSections = (allPricingSections ?? []) as Parameters<
      typeof QuotationItemsArea
    >[0]['sections'];

    return (
      <QuotationItemsArea
        sections={pricingSections}
        onSectionsChange={(updated) => onChange(updated)}
      />
    );
  }

  // ── COVER ------------------------------------------------------------------
  if (type === 'COVER') {
    const data: CoverSectionData = {
      subject:     meta(section, 'subject',     meta(section, 'coverTitle', '')),
      coverLetter: meta(section, 'coverLetter', meta(section, 'coverIntro', '')),
      preparedBy:  meta(section, 'preparedBy',  ''),
      validUntil:  meta(section, 'validUntil',  meta(section, 'expiredDate', '')),
    };
    return (
      <CoverSection
        data={data}
        readOnly={readOnly}
        onChange={(updated) =>
          onChange(withMeta(section, updated as Record<string, unknown>))
        }
      />
    );
  }

  // ── TIMELINE ---------------------------------------------------------------
  if (type === 'TIMELINE') {
    const milestones: TimelineMilestone[] = meta(section, 'milestones', []);
    return (
      <TimelineSection
        milestones={milestones}
        readOnly={readOnly}
        onChange={(updated) => onChange(withMeta(section, { milestones: updated }))}
      />
    );
  }

  // ── ACCEPTANCE -------------------------------------------------------------
  if (type === 'ACCEPTANCE') {
    const data: AcceptanceData = {
      signatoryName: meta(section, 'signatoryName', ''),
      signatoryDesignation: meta(section, 'signatoryDesignation', ''),
      signatureDate: meta(section, 'signatureDate', ''),
      signatureDataUrl: meta(section, 'signatureDataUrl', ''),
    };
    return (
      <AcceptanceSection
        data={data}
        readOnly={readOnly}
        onChange={(updated) =>
          onChange(withMeta(section, updated as Record<string, unknown>))
        }
      />
    );
  }

  // ── SUMMARY (legacy) ───────────────────────────────────────────────────
  if (type === 'SUMMARY') {
    return (
      <SummarySection
        data={{
          projectOverview: meta(section, 'projectOverview', ''),
          financialStatement: meta(section, 'financialStatement', ''),
        }}
        readOnly={readOnly}
        onChange={(data) => onChange(withMeta(section, data as Record<string, unknown>))}
      />
    );
  }

  // ── TERMS (legacy) ─────────────────────────────────────────────────────
  if (type === 'TERMS') {
    return (
      <TermsSection
        data={{ tos: meta(section, 'tos', meta(section, 'content', '')) }}
        readOnly={readOnly}
        onChange={(data) => onChange(withMeta(section, { tos: data.tos, content: data.tos }))}
      />
    );
  }

  // ── New metadata-driven types ───────────────────────────────────────────
  // Helper for metadata sub-key read/write
  const metaObj = section.metadata ?? {};
  const metaData = (key: string) => metaObj[key] ?? {};
  const updateMetaKey = (key: string, value: any) =>
    onChange(withMeta(section, { [key]: value }));

  if (type === 'CLIENT_INFO') {
    return <ClientInfoSection data={metaData('clientInfo')} onChange={(d) => updateMetaKey('clientInfo', d)} readOnly={readOnly} contacts={clientContacts} />;
  }
  if (type === 'PROJECT_SUMMARY') {
    return <ProjectSummarySection data={metaData('projectSummary')} onChange={(d) => updateMetaKey('projectSummary', d)} readOnly={readOnly} />;
  }
  if (type === 'SCOPE') {
    return <ScopeSection data={metaData('scope')} onChange={(d) => updateMetaKey('scope', d)} readOnly={readOnly} />;
  }
  if (type === 'PAYMENT_TERMS') {
    return <PaymentTermsSection data={metaData('paymentTerms')} onChange={(d) => updateMetaKey('paymentTerms', d)} readOnly={readOnly} />;
  }
  if (type === 'LEGAL_TERMS') {
    return <LegalTermsSection data={metaData('legalTerms')} onChange={(d) => updateMetaKey('legalTerms', d)} readOnly={readOnly} />;
  }
  if (type === 'EXECUTIVE_SUMMARY') {
    return <ExecutiveSummarySection data={metaData('executiveSummary')} onChange={(d) => updateMetaKey('executiveSummary', d)} readOnly={readOnly} />;
  }
  if (type === 'COMPANY_OVERVIEW') {
    return <CompanyOverviewSection data={metaData('companyOverview')} onChange={(d) => updateMetaKey('companyOverview', d)} readOnly={readOnly} />;
  }
  if (type === 'TECHNICAL_APPROACH') {
    return <TechnicalApproachSection data={metaData('technicalApproach')} onChange={(d) => updateMetaKey('technicalApproach', d)} readOnly={readOnly} />;
  }
  if (type === 'ARCHITECTURE_OVERVIEW') {
    return <ArchitectureOverviewSection data={metaData('architectureOverview')} onChange={(d) => updateMetaKey('architectureOverview', d)} readOnly={readOnly} />;
  }
  if (type === 'TEAM_STRUCTURE') {
    return <TeamStructureSection data={metaData('teamStructure')} onChange={(d) => updateMetaKey('teamStructure', d)} readOnly={readOnly} />;
  }
  if (type === 'ASSUMPTIONS') {
    return <AssumptionsSection data={metaData('assumptions')} onChange={(d) => updateMetaKey('assumptions', d)} readOnly={readOnly} />;
  }
  if (type === 'RISK_ASSESSMENT') {
    return <RiskAssessmentSection data={metaData('riskAssessment')} onChange={(d) => updateMetaKey('riskAssessment', d)} readOnly={readOnly} />;
  }
  if (type === 'SUPPORT_SLA') {
    return <SupportSLASection data={metaData('supportSLA')} onChange={(d) => updateMetaKey('supportSLA', d)} readOnly={readOnly} />;
  }
  if (type === 'APPENDIX') {
    return <AppendixSection data={metaData('appendix')} onChange={(d) => updateMetaKey('appendix', d)} readOnly={readOnly} />;
  }

  // ── CUSTOM / fallback ───────────────────────────────────────────────────
  const content: string = meta(section, 'content', '');
  return (
    <RichTextSection
      label={section.title ?? 'Content'}
      placeholder="Enter section content…"
      content={content}
      readOnly={readOnly}
      onChange={(updated) => onChange(withMeta(section, { content: updated }))}
    />
  );
}
