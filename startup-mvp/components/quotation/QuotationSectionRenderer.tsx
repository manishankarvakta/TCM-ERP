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
  const metaData = (key: string) => (section.metadata ?? {})[key] ?? {};
  const updateMeta = (key: string, value: any) =>
    onUpdate({ metadata: { ...(section.metadata ?? {}), [key]: value } });

  switch (section.sectionType) {
    // ── PRICING (unchanged) ───────────────────────────────────────────────────
    case 'PRICING':
      return (
        <QuotationItemsArea
          sections={[section as any]}
          onSectionsChange={(updated: any[]) => { if (updated[0]) onUpdate(updated[0]); }}
        />
      );

    // ── COVER ─────────────────────────────────────────────────────────────────
    case 'COVER':
      return (
        <CoverSection
          data={{ subject: section.subject, coverLetter: section.coverLetter, preparedBy: section.preparedBy, validUntil: section.validUntil }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
        />
      );

    // ── CLIENT_INFO ───────────────────────────────────────────────────────────
    case 'CLIENT_INFO':
      return <ClientInfoSection data={metaData('clientInfo')} onChange={(d) => updateMeta('clientInfo', d)} readOnly={readOnly} />;

    // ── PROJECT_SUMMARY ───────────────────────────────────────────────────────
    case 'PROJECT_SUMMARY':
      return <ProjectSummarySection data={metaData('projectSummary')} onChange={(d) => updateMeta('projectSummary', d)} readOnly={readOnly} />;

    // ── SCOPE ─────────────────────────────────────────────────────────────────
    case 'SCOPE':
      return <ScopeSection data={metaData('scope')} onChange={(d) => updateMeta('scope', d)} readOnly={readOnly} />;

    // ── TIMELINE ─────────────────────────────────────────────────────────────
    case 'TIMELINE':
      return <TimelineSection milestones={section.milestones ?? []} onChange={(milestones) => onUpdate({ milestones })} readOnly={readOnly} />;

    // ── PAYMENT_TERMS ─────────────────────────────────────────────────────────
    case 'PAYMENT_TERMS':
      return <PaymentTermsSection data={metaData('paymentTerms')} onChange={(d) => updateMeta('paymentTerms', d)} readOnly={readOnly} />;

    // ── LEGAL_TERMS ───────────────────────────────────────────────────────────
    case 'LEGAL_TERMS':
      return <LegalTermsSection data={metaData('legalTerms')} onChange={(d) => updateMeta('legalTerms', d)} readOnly={readOnly} />;

    // ── ACCEPTANCE ────────────────────────────────────────────────────────────
    case 'ACCEPTANCE':
      return (
        <AcceptanceSection
          data={{ acceptanceText: section.acceptanceText, signatoryName: section.signatoryName, signatoryDesignation: section.signatoryDesignation, signatureDate: section.signatureDate, signatureDataUrl: section.signatureDataUrl }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
        />
      );

    // ── EXECUTIVE_SUMMARY ─────────────────────────────────────────────────────
    case 'EXECUTIVE_SUMMARY':
      return <ExecutiveSummarySection data={metaData('executiveSummary')} onChange={(d) => updateMeta('executiveSummary', d)} readOnly={readOnly} />;

    // ── COMPANY_OVERVIEW ──────────────────────────────────────────────────────
    case 'COMPANY_OVERVIEW':
      return <CompanyOverviewSection data={metaData('companyOverview')} onChange={(d) => updateMeta('companyOverview', d)} readOnly={readOnly} />;

    // ── TECHNICAL_APPROACH ────────────────────────────────────────────────────
    case 'TECHNICAL_APPROACH':
      return <TechnicalApproachSection data={metaData('technicalApproach')} onChange={(d) => updateMeta('technicalApproach', d)} readOnly={readOnly} />;

    // ── ARCHITECTURE_OVERVIEW ─────────────────────────────────────────────────
    case 'ARCHITECTURE_OVERVIEW':
      return <ArchitectureOverviewSection data={metaData('architectureOverview')} onChange={(d) => updateMeta('architectureOverview', d)} readOnly={readOnly} />;

    // ── TEAM_STRUCTURE ────────────────────────────────────────────────────────
    case 'TEAM_STRUCTURE':
      return <TeamStructureSection data={metaData('teamStructure')} onChange={(d) => updateMeta('teamStructure', d)} readOnly={readOnly} />;

    // ── ASSUMPTIONS ───────────────────────────────────────────────────────────
    case 'ASSUMPTIONS':
      return <AssumptionsSection data={metaData('assumptions')} onChange={(d) => updateMeta('assumptions', d)} readOnly={readOnly} />;

    // ── RISK_ASSESSMENT ───────────────────────────────────────────────────────
    case 'RISK_ASSESSMENT':
      return <RiskAssessmentSection data={metaData('riskAssessment')} onChange={(d) => updateMeta('riskAssessment', d)} readOnly={readOnly} />;

    // ── SUPPORT_SLA ───────────────────────────────────────────────────────────
    case 'SUPPORT_SLA':
      return <SupportSLASection data={metaData('supportSLA')} onChange={(d) => updateMeta('supportSLA', d)} readOnly={readOnly} />;

    // ── APPENDIX ──────────────────────────────────────────────────────────────
    case 'APPENDIX':
      return <AppendixSection data={metaData('appendix')} onChange={(d) => updateMeta('appendix', d)} readOnly={readOnly} />;

    // ── SUMMARY (legacy) ──────────────────────────────────────────────────────
    case 'SUMMARY':
      return (
        <SummarySection
          data={{ projectOverview: section.projectOverview, financialStatement: section.financialStatement }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
        />
      );

    // ── TERMS (legacy) ────────────────────────────────────────────────────────
    case 'TERMS':
      return (
        <TermsSection
          data={{ tos: section.tos ?? section.content ?? section.note ?? '' }}
          onChange={(data) => onUpdate({ tos: data.tos, content: data.tos, note: data.tos })}
          readOnly={readOnly}
        />
      );

    // ── CUSTOM / fallback ─────────────────────────────────────────────────────
    case 'CUSTOM':
    default:
      return (
        <RichTextSection
          content={getContent(section)}
          label="Section Content"
          placeholder="Enter custom content for this section…"
          onChange={(content) => onUpdate({ content, note: content })}
          readOnly={readOnly}
        />
      );
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuotationSectionRenderer({
  sections,
  onUpdateSection,
  readOnly = false,
}: QuotationSectionRendererProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        <p className="font-medium">No sections yet.</p>
        <p className="mt-1 text-xs">Add a section using the toolbar above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionType: SectionType = (section.sectionType as SectionType) ?? 'CUSTOM';
        const isCollapsed = collapsedIds.has(section.id);
        const handleUpdate = (patch: Partial<RendererSection>) => onUpdateSection({ ...section, ...patch });

        return (
          <QuotationSectionCard
            key={section.id}
            id={section.id}
            title={section.title}
            sectionType={sectionType}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleCollapse(section.id)}
          >
            <SectionContent section={section} onUpdate={handleUpdate} readOnly={readOnly} />
          </QuotationSectionCard>
        );
      })}
    </div>
  );
}
