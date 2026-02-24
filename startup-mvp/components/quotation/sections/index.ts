/**
 * sections/index.ts — barrel export for all quotation section components
 */

export { SectionRenderer }            from '../SectionRenderer';
export type { SectionType, RendererSection, SectionRendererProps } from '../SectionRenderer';

// ── Core sections ─────────────────────────────────────────────────────────────
export { CoverSection }               from './CoverSection';
export type { CoverSectionData, CoverSectionProps } from './CoverSection';

export { ClientInfoSection }          from './ClientInfoSection';
export type { ClientInfoData }        from './ClientInfoSection';

export { ProjectSummarySection }      from './ProjectSummarySection';
export type { ProjectSummaryData }    from './ProjectSummarySection';

export { ScopeSection }               from './ScopeSection';
export type { ScopeData, Deliverable }from './ScopeSection';

export { RichTextSection }            from './RichTextSection';
export type { RichTextSectionProps }  from './RichTextSection';

export { TimelineSection }            from './TimelineSection';
export type { TimelineMilestone, TimelineSectionProps } from './TimelineSection';

export { PaymentTermsSection }        from './PaymentTermsSection';
export type { PaymentTermsData }      from './PaymentTermsSection';

export { LegalTermsSection }          from './LegalTermsSection';
export type { LegalTermsData }        from './LegalTermsSection';

export { AcceptanceSection }          from './AcceptanceSection';
export type { AcceptanceData, AcceptanceSectionProps } from './AcceptanceSection';

// ── Optional library sections ─────────────────────────────────────────────────
export { ExecutiveSummarySection }    from './ExecutiveSummarySection';
export type { ExecutiveSummaryData }  from './ExecutiveSummarySection';

export { CompanyOverviewSection }     from './CompanyOverviewSection';
export type { CompanyOverviewData }   from './CompanyOverviewSection';

export { TechnicalApproachSection }   from './TechnicalApproachSection';
export type { TechnicalApproachData } from './TechnicalApproachSection';

export { ArchitectureOverviewSection }from './ArchitectureOverviewSection';
export type { ArchitectureOverviewData } from './ArchitectureOverviewSection';

export { TeamStructureSection }       from './TeamStructureSection';
export type { TeamStructureData, TeamMember } from './TeamStructureSection';

export { AssumptionsSection }         from './AssumptionsSection';
export type { AssumptionsData }       from './AssumptionsSection';

export { RiskAssessmentSection }      from './RiskAssessmentSection';
export type { RiskAssessmentData, RiskRow } from './RiskAssessmentSection';

export { SupportSLASection }          from './SupportSLASection';
export type { SupportSLAData }        from './SupportSLASection';

export { AppendixSection }            from './AppendixSection';
export type { AppendixData }          from './AppendixSection';

// ── Legacy ────────────────────────────────────────────────────────────────────
export { SummarySection }             from './SummarySection';
export { TermsSection }               from './TermsSection';
