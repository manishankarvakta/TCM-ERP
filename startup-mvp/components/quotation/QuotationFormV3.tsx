'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { useState, useCallback, useMemo, useEffect, useRef, startTransition } from 'react';
import { QuotationSectionCard } from '@/components/quotation/builder/QuotationSectionCard';
import { StickyTotalsBar } from '@/components/quotation/StickyTotalsBar';
import { QuotationHeaderBar } from '@/components/quotation/builder/QuotationHeaderBar';
import type { QuotationMode, QuotationStatus } from '@/components/quotation/builder/QuotationHeaderBar';
import { ProjectInfoSection } from './ProjectInfoSection';
import { ClientInformationSection } from './ClientInformationSection';
import { SubmissionInformationSection } from './SubmissionInformationSection';
import { QuotationBasicInfoCard } from './QuotationBasicInfoCard';
import { QuotationItemsArea } from './QuotationItemsArea';
import type { ProjectType, LocationType } from '@/types/enums';
import { getQuotationUser, getQuotationSettings } from '@/app/actions/quotation-helpers';
import { getActiveOrganizations } from '@/app/actions/organizations';
import { useAppDispatch } from '@/lib/redux/hooks';
import { updateQuotationField, setCurrentQuotation, updateSections } from '@/lib/redux/slices/quotationSlice';

// ── Proposal section system ───────────────────────────────────────────────────
import { getDefaultSections, makeBlankSection } from '@/lib/quotation/defaultSections';
import { SectionLibraryModal } from '@/components/quotation/builder/SectionLibraryModal';
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';
import { SECTION_REGISTRY } from '@/components/quotation/sectionRegistry';

// Section leaf components for per-type rendering
import { CoverSection } from '@/components/quotation/sections/CoverSection';
import { SummarySection } from '@/components/quotation/sections/SummarySection';
import { AcceptanceSection } from '@/components/quotation/sections/AcceptanceSection';
import { TimelineSection } from '@/components/quotation/sections/TimelineSection';
import { TermsSection } from '@/components/quotation/sections/TermsSection';
import { RichTextSection } from '@/components/quotation/sections/RichTextSection';
import { ClientInfoSection } from '@/components/quotation/sections/ClientInfoSection';
import { ProjectSummarySection } from '@/components/quotation/sections/ProjectSummarySection';
import { ScopeSection } from '@/components/quotation/sections/ScopeSection';
import { PaymentTermsSection } from '@/components/quotation/sections/PaymentTermsSection';
import { LegalTermsSection } from '@/components/quotation/sections/LegalTermsSection';
import { ExecutiveSummarySection } from '@/components/quotation/sections/ExecutiveSummarySection';
import { CompanyOverviewSection } from '@/components/quotation/sections/CompanyOverviewSection';
import { TechnicalApproachSection } from '@/components/quotation/sections/TechnicalApproachSection';
import { ArchitectureOverviewSection } from '@/components/quotation/sections/ArchitectureOverviewSection';
import { TeamStructureSection } from '@/components/quotation/sections/TeamStructureSection';
import { AssumptionsSection } from '@/components/quotation/sections/AssumptionsSection';
import { RiskAssessmentSection } from '@/components/quotation/sections/RiskAssessmentSection';
import { SupportSLASection } from '@/components/quotation/sections/SupportSLASection';
import { AppendixSection } from '@/components/quotation/sections/AppendixSection';
import { Plus } from 'lucide-react';

  // Validation schema matching Prisma schema
const quotationSchema = z.object({
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  date: z.string().min(1, 'Date is required'),
  subject: z.string().min(1, 'Subject is required'),
  submittedTo: z.string().optional(),
  coverLetter: z.string().optional(),
  financialStatement: z.string().optional(),
  tos: z.string().optional(),
  expiredDate: z.string().optional(),
  
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  
  opportunityId: z.string().optional().nullable(),
  
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientAddress: z.string().optional(),
  clientContact: z.string().optional(),
  
  submittedById: z.string().optional(),
  submittedBy: z.string().optional(),
  submittedByContact: z.string().optional(),
  
  shippingCharges: z.number().default(0),
  discount: z.number().default(0),
  vatIncluded: z.boolean().default(false),
  
  projectLocation: z.string().optional(),
  
  sections: z.array(
    z.object({
      title: z.string().min(1, 'Section title is required'),
      note: z.string().optional(),
      discount: z.number().default(0),
      total: z.number().default(0),
      grandTotal: z.number().default(0),
      sortOrder: z.number().default(0),
      categoryId: z.string().optional().nullable(),
      items: z.array(
        z.object({
          sl: z.number(),
          no: z.string().optional().nullable(),
          code: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          height: z.number().optional().nullable(),
          width: z.number().optional().nullable(),
          depth: z.number().optional().nullable(),
          unit: z.string().optional().nullable(),
          unitPrice: z.number().min(0).default(0),
          quantity: z.number().min(0).default(0),
          discount: z.number().min(0).default(0),
          amount: z.number().min(0).default(0),
          itemId: z.string().optional().nullable(),
        })
      ).default([]),
      groups: z.array(
        z.object({
          code: z.string().optional().nullable(),
          description: z.string().min(1, 'Group description is required'),
          quantity: z.number().optional().nullable(),
          number: z.number().optional().nullable(),
          sortOrder: z.number().default(0),
          baseUnit: z.string().optional().nullable(),
          baseUnitPrice: z.number().optional().nullable(),
          items: z.array(
            z.object({
              sl: z.number(),
              no: z.string().optional().nullable(),
              code: z.string().optional().nullable(),
              description: z.string().optional().nullable(),
              height: z.number().optional().nullable(),
              width: z.number().optional().nullable(),
              depth: z.number().optional().nullable(),
              unit: z.string().optional().nullable(),
              unitPrice: z.number().min(0).default(0),
              quantity: z.number().min(0).default(0),
              discount: z.number().min(0).default(0),
              amount: z.number().min(0).default(0),
              itemId: z.string().optional().nullable(),
            })
          ).default([]),
        })
      ).default([]),
      categoryGroups: z.array(
        z.object({
          categoryId: z.string().optional().nullable(),
          sortOrder: z.number().default(0),
          items: z.array(
            z.object({
              sl: z.number(),
              no: z.string().optional().nullable(),
              code: z.string().optional().nullable(),
              description: z.string().optional().nullable(),
              height: z.number().optional().nullable(),
              width: z.number().optional().nullable(),
              depth: z.number().optional().nullable(),
              unit: z.string().optional().nullable(),
              unitPrice: z.number().min(0).default(0),
              quantity: z.number().min(0).default(0),
              discount: z.number().min(0).default(0),
              amount: z.number().min(0).default(0),
              itemId: z.string().optional().nullable(),
            })
          ).default([]),
        })
      ).default([]),
    })
  ).min(1, 'At least one section is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface QuotationFormV3Props {
  initialData?: any;
  onSubmit: (data: any) => void;
}

// ── Helper: render metadata-driven section content per type ────────────────────
function SectionContentInner({
  section,
  onUpdate,
  readOnly,
  onPricingChange,
  formValues,
}: {
  section: any;
  onUpdate: (patch: Record<string, any>) => void;
  readOnly: boolean;
  onPricingChange: (updated: any[]) => void;
  formValues?: any;
}) {
  const metaData = (key: string) => (section.metadata ?? {})[key] ?? {};
  const updateMeta = (key: string, value: any) =>
    onUpdate({ metadata: { ...(section.metadata ?? {}), [key]: value } });

  const sectionType = section.sectionType || 'PRICING';

  switch (sectionType) {
    case 'PRICING':
      return (
        <QuotationItemsArea
          sections={[section]}
          onSectionsChange={onPricingChange}
        />
      );
    case 'COVER':
      return (
        <CoverSection
          data={{ subject: section.subject, coverLetter: section.coverLetter, preparedBy: section.preparedBy, validUntil: section.validUntil }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
          context={{
            clientName: formValues?.clientName,
            projectName: formValues?.subject,
            yourCompany: formValues?.organizationName,
            yourName: formValues?.submittedBy,
            date: formValues?.date,
            validUntil: formValues?.expiredDate,
          }}
        />
      );
    case 'CLIENT_INFO':
      return <ClientInfoSection data={metaData('clientInfo')} onChange={(d) => updateMeta('clientInfo', d)} readOnly={readOnly} />;
    case 'PROJECT_SUMMARY':
      return <ProjectSummarySection data={metaData('projectSummary')} onChange={(d) => updateMeta('projectSummary', d)} readOnly={readOnly} />;
    case 'SCOPE':
      return <ScopeSection data={metaData('scope')} onChange={(d) => updateMeta('scope', d)} readOnly={readOnly} />;
    case 'TIMELINE':
      return <TimelineSection milestones={section.milestones ?? []} onChange={(milestones) => onUpdate({ milestones })} readOnly={readOnly} />;
    case 'LEGAL_TERMS':
      // Map consolidated data to TermsSection
      return (
        <TermsSection
          data={{ 
            tos: section.tos ?? (section.metadata?.legalTerms?.content || ''),
            paymentTerms: section.paymentTerms ?? (section.metadata?.legalTerms?.paymentTerms || ''),
            refundPolicy: section.refundPolicy ?? (section.metadata?.legalTerms?.refundPolicy || ''),
            terminationPolicy: section.terminationPolicy ?? (section.metadata?.legalTerms?.terminationPolicy || ''),
          }}
          onChange={(data) => onUpdate({ 
            tos: data.tos,
            paymentTerms: data.paymentTerms,
            refundPolicy: data.refundPolicy,
            terminationPolicy: data.terminationPolicy,
            metadata: {
              ...(section.metadata || {}),
              legalTerms: {
                ...(section.metadata?.legalTerms || {}),
                tos: data.tos,
                paymentTerms: data.paymentTerms,
                refundPolicy: data.refundPolicy,
                terminationPolicy: data.terminationPolicy,
              }
            }
          })}
          readOnly={readOnly}
        />
      );
    case 'ACCEPTANCE':
      return (
        <AcceptanceSection
          data={{ acceptanceText: section.acceptanceText, signatoryName: section.signatoryName, signatoryDesignation: section.signatoryDesignation, signatureDate: section.signatureDate, signatureDataUrl: section.signatureDataUrl }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
        />
      );
    case 'EXECUTIVE_SUMMARY':
      return <ExecutiveSummarySection data={metaData('executiveSummary')} onChange={(d) => updateMeta('executiveSummary', d)} readOnly={readOnly} />;
    case 'COMPANY_OVERVIEW':
      return <CompanyOverviewSection data={metaData('companyOverview')} onChange={(d) => updateMeta('companyOverview', d)} readOnly={readOnly} />;
    case 'TECHNICAL_APPROACH':
      return <TechnicalApproachSection data={metaData('technicalApproach')} onChange={(d) => updateMeta('technicalApproach', d)} readOnly={readOnly} />;
    case 'ARCHITECTURE_OVERVIEW':
      return <ArchitectureOverviewSection data={metaData('architectureOverview')} onChange={(d) => updateMeta('architectureOverview', d)} readOnly={readOnly} />;
    case 'TEAM_STRUCTURE':
      return <TeamStructureSection data={metaData('teamStructure')} onChange={(d) => updateMeta('teamStructure', d)} readOnly={readOnly} />;
    case 'ASSUMPTIONS':
      return <AssumptionsSection data={metaData('assumptions')} onChange={(d) => updateMeta('assumptions', d)} readOnly={readOnly} />;
    case 'RISK_ASSESSMENT':
      return <RiskAssessmentSection data={metaData('riskAssessment')} onChange={(d) => updateMeta('riskAssessment', d)} readOnly={readOnly} />;
    case 'SUPPORT_SLA':
      return <SupportSLASection data={metaData('supportSLA')} onChange={(d) => updateMeta('supportSLA', d)} readOnly={readOnly} />;
    case 'APPENDIX':
      return <AppendixSection data={metaData('appendix')} onChange={(d) => updateMeta('appendix', d)} readOnly={readOnly} />;
    case 'SUMMARY':
      return (
        <SummarySection
          data={{ projectOverview: section.projectOverview, financialStatement: section.financialStatement }}
          onChange={(data) => onUpdate(data)}
          readOnly={readOnly}
        />
      );
    case 'TERMS':
      return (
        <TermsSection
          data={{ tos: section.tos ?? section.content ?? section.note ?? '' }}
          onChange={(data) => onUpdate({ tos: data.tos, content: data.tos, note: data.tos })}
          readOnly={readOnly}
        />
      );
    case 'CUSTOM':
    default:
      return (
        <RichTextSection
          content={section.content ?? section.note ?? ''}
          label="Section Content"
          placeholder="Enter content for this section…"
          onChange={(content) => onUpdate({ content, note: content })}
          readOnly={readOnly}
        />
      );
  }
}

// ── Helper: Sections list with per-type rendering ─────────────────────────────
function SectionsList({
  sections,
  collapsedSections,
  toggleSection,
  isSectionComplete,
  watchedValuesObject,
  handleSectionsChange,
}: {
  sections: any[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  isSectionComplete: (section: any, formValues: any) => boolean;
  watchedValuesObject: any;
  handleSectionsChange: (newSections: any[]) => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionId = section.id ?? String(section.sortOrder ?? section.displayOrder ?? 0);
        const isCollapsed = !!collapsedSections[sectionId];
        const sectionType = section.sectionType || 'PRICING';
        const config = SECTION_REGISTRY[sectionType as SectionType];

        const handleUpdate = (patch: Record<string, any>) => {
          handleSectionsChange(
            sections.map((s) =>
              (s.id ?? String(s.sortOrder ?? 0)) === sectionId
                ? { ...s, ...patch }
                : s
            )
          );
        };

        const handlePricingChange = (updated: any[]) => {
          if (updated[0]) {
            handleSectionsChange(
              sections.map((s) =>
                (s.id ?? String(s.sortOrder ?? 0)) === sectionId ? updated[0] : s
              )
            );
          }
        };

        return (
          <QuotationSectionCard
            key={sectionId}
            id={sectionId}
            title={section.title || config?.label || 'Section'}
            sectionType={sectionType}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => toggleSection(sectionId)}
            isComplete={isSectionComplete(section, watchedValuesObject)}
          >
            <SectionContentInner
              section={section}
              onUpdate={handleUpdate}
              readOnly={false}
              onPricingChange={handlePricingChange}
              formValues={watchedValuesObject}
            />
          </QuotationSectionCard>
        );
      })}
    </div>
  );
}

// ── Helper: Add Section button + modal ────────────────────────────────────────
function AddSectionButton({
  sections,
  handleSectionsChange,
}: {
  sections: any[];
  handleSectionsChange: (newSections: any[]) => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Sections already present — so the library can grey them out
  const existingTypes = useMemo(
    () => new Set(sections.map((s) => s.sectionType || 'PRICING')),
    [sections]
  );

  const handleAddSection = useCallback(
    (sectionType: string) => {
      const config = SECTION_REGISTRY[sectionType as SectionType];
      const newSection = makeBlankSection(
        sectionType,
        config?.label || sectionType,
        sections.length // sortOrder
      );
      handleSectionsChange([...sections, newSection]);
      setLibraryOpen(false);

      // Scroll to the new section after a tick
      setTimeout(() => {
        const el = document.getElementById(newSection.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    [sections, handleSectionsChange]
  );

  return (
    <>
      <div className="flex justify-center py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setLibraryOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>
      <SectionLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onAddSection={handleAddSection}
      />
    </>
  );
}

export function QuotationFormV3({ initialData, onSubmit }: QuotationFormV3Props) {
  const dispatch = useAppDispatch();
  
  // Debug: Track renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[QuotationFormV3] Render #${renderCountRef.current}`);
  }
  
  // Normalize and ensure all items and groups have IDs for drag and drop
  // Also preserves sectionType and metadata for backward compat
  const ensureIds = (sections: any[]) => {
    return sections.map((section, sectionIndex) => ({
      title: section.title || `Section ${sectionIndex + 1}`,
      note: section.note || '',
      discount: section.discount ?? 0,
      total: section.total ?? 0,
      grandTotal: section.grandTotal ?? 0,
      sortOrder: section.sortOrder ?? sectionIndex,
      categoryId: section.categoryId || null,
      // ── Preserve proposal fields ──────────────────────────────────────
      id: section.id || `section-${Date.now()}-${sectionIndex}`,
      sectionType: section.sectionType || 'PRICING',
      metadata: section.metadata ?? {},
      // Legacy cover/acceptance/timeline fields
      subject: section.subject,
      coverLetter: section.coverLetter,
      preparedBy: section.preparedBy,
      validUntil: section.validUntil,
      projectOverview: section.projectOverview,
      financialStatement: section.financialStatement,
      tos: section.tos,
      content: section.content,
      milestones: section.milestones,
      acceptanceText: section.acceptanceText,
      signatoryName: section.signatoryName,
      signatoryDesignation: section.signatoryDesignation,
      signatureDate: section.signatureDate,
      signatureDataUrl: section.signatureDataUrl,
      // ── Pricing arrays ────────────────────────────────────────────────
      items: (section.items || []).map((item: any, index: number) => ({
        sl: item.sl ?? index + 1,
        no: item.no != null ? String(item.no) : null,
        code: item.code || null,
        description: item.description || null,
        height: item.height ?? null,
        width: item.width ?? null,
        depth: item.depth ?? null,
        unit: item.unit || null,
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        discount: item.discount ?? 0,
        amount: item.amount ?? 0,
        itemId: item.itemId || null,
        id: item.id || `item-${Date.now()}-${index}-${Math.random()}`,
      })),
      groups: (section.groups || []).map((group: any, groupIndex: number) => ({
        code: group.code || null,
        description: group.description || 'Untitled Group',
        quantity: group.quantity ?? 0,
        number: group.number ?? 0,
        sortOrder: group.sortOrder ?? groupIndex,
        moduleGroupId: group.moduleGroupId || null,
        baseUnit: group.baseUnit || null,
        baseUnitPrice: group.baseUnitPrice || null,
        id: group.id || `group-${Date.now()}-${groupIndex}-${Math.random()}`,
        isExpanded: group.isExpanded !== undefined ? group.isExpanded : true,
        items: (group.items || []).map((item: any, itemIndex: number) => ({
          sl: item.sl ?? itemIndex + 1,
          no: item.no != null ? String(item.no) : null,
          code: item.code || null,
          description: item.description || null,
          height: item.height ?? null,
          width: item.width ?? null,
          depth: item.depth ?? null,
          unit: item.unit || null,
          unitPrice: item.unitPrice ?? 0,
          quantity: item.quantity ?? 0,
          discount: item.discount ?? 0,
          amount: item.amount ?? 0,
          itemId: item.itemId || null,
          moduleGroupItemId: item.moduleGroupItemId || null,
          id: item.id || `item-${Date.now()}-${groupIndex}-${itemIndex}-${Math.random()}`,
        })),
      })),
      categoryGroups: (section.categoryGroups || []).map((categoryGroup: any, categoryGroupIndex: number) => ({
        categoryId: categoryGroup.categoryId || null,
        sortOrder: categoryGroup.sortOrder ?? categoryGroupIndex,
        id: categoryGroup.id || `categoryGroup-${Date.now()}-${categoryGroupIndex}-${Math.random()}`,
        isExpanded: categoryGroup.isExpanded !== undefined ? categoryGroup.isExpanded : true,
        items: (categoryGroup.items || []).map((item: any, itemIndex: number) => ({
          sl: item.sl ?? itemIndex + 1,
          no: item.no != null ? String(item.no) : null,
          code: item.code || null,
          description: item.description || null,
          height: item.height ?? null,
          width: item.width ?? null,
          depth: item.depth ?? null,
          unit: item.unit || null,
          unitPrice: item.unitPrice ?? 0,
          quantity: item.quantity ?? 0,
          discount: item.discount ?? 0,
          amount: item.amount ?? 0,
          itemId: item.itemId || null,
          id: item.id || `item-${Date.now()}-${categoryGroupIndex}-${itemIndex}-${Math.random()}`,
        })),
      })),
    }));
  };

  // ── TASK 1: Default sections ─────────────────────────────────────────────────
  // Existing quotation data → preserve as-is; new quotation → 9 core sections
  const sectionsFromData = initialData?.sections || initialData?.section || [];
  const defaultSections = sectionsFromData.length > 0
    ? ensureIds(sectionsFromData)
    : getDefaultSections();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      quotationNumber: initialData?.quotationNumber || generateQuotationNumber(),
      date: initialData?.date
        ? typeof initialData.date === 'string'
          ? initialData.date
          : new Date(initialData.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      subject: initialData?.subject || '',
      submittedTo: initialData?.submittedTo || '',
      coverLetter: initialData?.coverLetter || '',
      financialStatement: initialData?.financialStatement || '',
      tos: initialData?.tos || '',
      expiredDate: initialData?.expiredDate 
        ? (typeof initialData.expiredDate === 'string' 
            ? initialData.expiredDate 
            : new Date(initialData.expiredDate).toISOString().split('T')[0])
        : '',
      clientId: initialData?.clientId || initialData?.client?.id || '',
      clientName: initialData?.client?.name || initialData?.clientName || '',
      clientAddress: initialData?.client?.address || initialData?.clientAddress || '',
      clientContact: initialData?.client?.phone || initialData?.clientContact || '',
      organizationId: initialData?.organizationId || initialData?.organization?.id || undefined,
      organizationName: initialData?.organizationName || initialData?.organization?.name || '',
      opportunityId: initialData?.opportunityId || '',
      submittedById: initialData?.submittedById || initialData?.submittedBy?.id || '',
      submittedBy: initialData?.submittedBy?.name || initialData?.submittedBy || '',
      submittedByContact: initialData?.submittedBy?.email || initialData?.submittedByContact || '',
      shippingCharges: initialData?.shippingCharges || 0,
      discount: initialData?.discount || 0,
      vatIncluded: initialData?.vatIncluded || false,
      projectLocation: initialData?.projectLocation || '',
      sections: defaultSections,
    },
  });

  const [sections, setSections] = useState<any[]>(defaultSections);

  // ── Collapse state ──────────────────────────────────────────────────────────
  // Maps section id → true (collapsed) | false/missing (expanded)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Completion rules ────────────────────────────────────────────────────────
  // Returns true when the section satisfies its done condition.
  // TASK 4: Extended with all 13 new metadata-driven section types.
  const isSectionComplete = useCallback(
    (section: any, formValues: typeof watchedValuesObject): boolean => {
      const type: string = section.sectionType || 'PRICING';
      const meta = section.metadata ?? {};

      switch (type) {
        // ── Original types (unchanged) ────────────────────────────────────
        case 'COVER':
          return !!(formValues.subject?.trim());
        case 'PRICING': {
          const flatItems   = (section.items        || []).length;
          const groupItems  = (section.groups       || []).reduce(
            (acc: number, g: any) => acc + (g.items?.length ?? 0), 0
          );
          const catItems    = (section.categoryGroups || []).reduce(
            (acc: number, cg: any) => acc + (cg.items?.length ?? 0), 0
          );
          return flatItems + groupItems + catItems > 0;
        }
        case 'TERMS':
          return (formValues.tos?.trim().length ?? 0) > 10;
        case 'SUMMARY':
          return (formValues.financialStatement?.trim().length ?? 0) > 10;
        case 'ACCEPTANCE':
          return !!(section.signatoryName?.trim());
        case 'TIMELINE':
          return (section.milestones?.length ?? 0) > 0;

        // ── New metadata-driven types ─────────────────────────────────────
        case 'CLIENT_INFO':
          return !!(meta.clientInfo?.companyName?.trim() || meta.clientInfo?.projectName?.trim());
        case 'PROJECT_SUMMARY':
          return !!(meta.projectSummary?.problemStatement?.trim());
        case 'SCOPE':
          return (meta.scope?.deliverables?.length ?? 0) > 0;
        case 'PAYMENT_TERMS':
          return (meta.paymentTerms?.paymentSchedule?.length ?? 0) > 0;
        case 'LEGAL_TERMS':
          return !!(meta.legalTerms?.confidentiality?.trim() || meta.legalTerms?.governingLaw?.trim());
        case 'EXECUTIVE_SUMMARY':
          return !!(meta.executiveSummary?.overview?.trim());
        case 'COMPANY_OVERVIEW':
          return !!(meta.companyOverview?.description?.trim());
        case 'TECHNICAL_APPROACH':
          return !!(meta.technicalApproach?.methodology?.trim());
        case 'ARCHITECTURE_OVERVIEW':
          return !!(meta.architectureOverview?.architectureDescription?.trim());
        case 'TEAM_STRUCTURE':
          return (meta.teamStructure?.teamMembers?.length ?? 0) > 0;
        case 'ASSUMPTIONS':
          return !!(meta.assumptions?.assumptions?.trim());
        case 'RISK_ASSESSMENT':
          return (meta.riskAssessment?.risks?.length ?? 0) > 0;
        case 'SUPPORT_SLA':
          return !!(meta.supportSLA?.supportDescription?.trim());
        case 'APPENDIX':
          return !!(meta.appendix?.attachments?.trim() || meta.appendix?.notes?.trim());

        default:
          // CUSTOM: treat as complete if note/content is set
          return (section.note?.trim().length ?? 0) > 10;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  
  // Track if initial data has been loaded to prevent repeated calls
  const hasLoadedDataRef = useRef(false);
  
  // Track if we're currently loading data to prevent Redux sync during initialization
  const isLoadingDataRef = useRef(false);

  // Fetch user, TOS, cover letters, and set first organization on mount (after useForm is initialized)
  useEffect(() => {
    // Guard: Only load once
    if (hasLoadedDataRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuotationFormV3] Skipping loadQuotationData - already loaded');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[QuotationFormV3] loadQuotationData useEffect triggered');
    }
    
    hasLoadedDataRef.current = true;
    
    const loadQuotationData = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuotationFormV3] Starting loadQuotationData...');
      }
      
      // Set flag to prevent Redux sync during initialization
      isLoadingDataRef.current = true;
      
      try {
        // Get current user
        const userResult = await getQuotationUser();
        if (userResult.success && userResult.user) {
          // Batch setValue calls with options to prevent unnecessary re-renders
          setValue('submittedById', userResult.user.id, { shouldDirty: false, shouldValidate: false });
          setValue('submittedBy', userResult.user.name || '', { shouldDirty: false, shouldValidate: false });
          setValue('submittedByContact', userResult.user.email || '', { shouldDirty: false, shouldValidate: false });
        }

        // Get Quotation Settings (TOS and Payment Terms) from settings
        const settingsResult = await getQuotationSettings();
        if (settingsResult.success) {
          if (settingsResult.tos) {
            setValue('tos', settingsResult.tos, { shouldDirty: false, shouldValidate: false });
          }
          
          // Pre-fill PAYMENT_TERMS section metadata if it exists and is currently empty
          if (settingsResult.paymentTerms && !initialData) {
            setSections(prev => prev.map(s => {
              if (s.sectionType === 'PAYMENT_TERMS') {
                return {
                  ...s,
                  metadata: {
                    ...s.metadata,
                    paymentTerms: {
                      ...(s.metadata?.paymentTerms || {}),
                      invoiceTerms: settingsResult.paymentTerms
                    }
                  }
                };
              }
              return s;
            }));
          }
        }

        // Set first organization as default for new quotations
        if (!initialData) {
          const orgResult = await getActiveOrganizations();
          if (orgResult.success && orgResult.organizations && orgResult.organizations.length > 0) {
            const firstOrg = orgResult.organizations[0];
            setValue('organizationId', firstOrg.id, { shouldDirty: false, shouldValidate: false });
            setValue('organizationName', firstOrg.name || '', { shouldDirty: false, shouldValidate: false });
            // Update Redux slice
            dispatch(updateQuotationField({ field: 'organizationId', value: firstOrg.id }));
            dispatch(updateQuotationField({ field: 'organizationName', value: firstOrg.name || '' }));
          }
        } else {
          // For edit mode, ensure organizationId and organizationName are set if they exist
          const data = initialData as any;
          if (data.organizationId) {
            setValue('organizationId', data.organizationId, { shouldDirty: false, shouldValidate: false });
            dispatch(updateQuotationField({ field: 'organizationId', value: data.organizationId }));
          }
          if (data.organizationName) {
            setValue('organizationName', data.organizationName, { shouldDirty: false, shouldValidate: false });
            dispatch(updateQuotationField({ field: 'organizationName', value: data.organizationName }));
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[QuotationFormV3] Finished loadQuotationData');
        }
      } finally {
        // Reset flag after initialization completes
        setTimeout(() => {
          isLoadingDataRef.current = false;
          if (process.env.NODE_ENV === 'development') {
            console.log('[QuotationFormV3] Initialization complete, Redux sync enabled');
          }
        }, 500); // Small delay to let all setValue calls settle
      }
    };

    if (!initialData) {
      loadQuotationData();
    } else {
      // For edit mode, still load TOS and user data, but preserve organization
      loadQuotationData();
    }
  }, [initialData, setValue, dispatch]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    let total = 0;
    sections.forEach((section) => {
      let sectionTotal = 0;
      section.items.forEach((item: any) => {
        sectionTotal += item.amount || 0;
      });
      section.groups.forEach((group: any) => {
        group.items.forEach((item: any) => {
          sectionTotal += item.amount || 0;
        });
      });
      // Subtract discount amount (not percentage)
      if (section.discount) {
        sectionTotal = sectionTotal - section.discount;
      }
      total += Math.max(0, sectionTotal); // Ensure total doesn't go negative
    });
    return total;
  }, [sections]);

  // Watch individual form values (more stable than array-based watch)
  const quotationNumber = watch('quotationNumber');
  const date = watch('date');
  const subject = watch('subject');
  const coverLetter = watch('coverLetter');
  const financialStatement = watch('financialStatement');
  const tos = watch('tos');
  const expiredDate = watch('expiredDate');
  const clientId = watch('clientId');
  const clientName = watch('clientName');
  const organizationId = watch('organizationId');
  const organizationName = watch('organizationName');
  const submittedById = watch('submittedById');
  const submittedBy = watch('submittedBy');
  const submittedByContact = watch('submittedByContact');
  const shippingCharges = watch('shippingCharges');
  const discount = watch('discount');
  const vatIncluded = watch('vatIncluded');
  const projectLocation = watch('projectLocation');
  const opportunityId = watch('opportunityId');

  // Memoize watched values object with stable dependencies
  const watchedValuesObject = useMemo(() => ({
    quotationNumber: quotationNumber || '',
    date: date || '',
    subject: subject || '',
    coverLetter: coverLetter || undefined,
    financialStatement: financialStatement || undefined,
    tos: tos || undefined,
    expiredDate: expiredDate || '',
    clientId: clientId || undefined,
    clientName: clientName || undefined,
    organizationId: organizationId || undefined,
    organizationName: organizationName || undefined,
    submittedById: submittedById || undefined,
    submittedBy: submittedBy || undefined,
    submittedByContact: submittedByContact || undefined,
    shippingCharges: shippingCharges || 0,
    discount: discount || 0,
    vatIncluded: vatIncluded || false,
    projectLocation: projectLocation || '',
    opportunityId: opportunityId || '',
  }), [
    quotationNumber,
    date,
    subject,
    coverLetter,
    financialStatement,
    tos,
    expiredDate,
    clientId,
    clientName,
    organizationId,
    organizationName,
    submittedById,
    submittedBy,
    submittedByContact,
    shippingCharges,
    discount,
    vatIncluded,
    projectLocation,
    opportunityId,
  ]);

  // Track previous values to prevent infinite loop
  // Only dispatch when values actually change, not when array reference changes
  const prevValuesRef = useRef<{
    quotationNumber?: string;
    date?: string;
    subject?: string;
    coverLetter?: string | null;
    financialStatement?: string | null;
    tos?: string | null;
    expiredDate?: string;
    clientId?: string;
    clientName?: string;
    organizationId?: string;
    organizationName?: string;
    submittedById?: string;
    submittedBy?: string;
    submittedByContact?: string;
    shippingCharges?: number;
    discount?: number;
    vatIncluded?: boolean;
    projectLocation?: string;
    opportunityId?: string;
    total?: number;
  }>({});

  // Debounce timer ref for Redux sync
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Circuit breaker to prevent infinite loops
  const updateCountRef = useRef(0);
  const updateCountResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_UPDATES_PER_SECOND = 10;

  // Helper function to collect changed fields
  const collectChangedFields = useCallback((prev: typeof prevValuesRef.current, current: typeof prevValuesRef.current) => {
    const updates: Array<{ field: keyof typeof prev; value: any }> = [];
    
    if (prev.quotationNumber !== current.quotationNumber) {
      updates.push({ field: 'quotationNumber', value: current.quotationNumber });
    }
    if (prev.date !== current.date) {
      updates.push({ field: 'date', value: current.date });
    }
    if (prev.subject !== current.subject) {
      updates.push({ field: 'subject', value: current.subject });
    }
    if (prev.coverLetter !== current.coverLetter) {
      updates.push({ field: 'coverLetter', value: current.coverLetter });
    }
    if (prev.financialStatement !== current.financialStatement) {
      updates.push({ field: 'financialStatement', value: current.financialStatement });
    }
    if (prev.tos !== current.tos) {
      updates.push({ field: 'tos', value: current.tos });
    }
    if (prev.expiredDate !== current.expiredDate) {
      updates.push({ field: 'expiredDate', value: current.expiredDate });
    }
    if (prev.clientId !== current.clientId) {
      updates.push({ field: 'clientId', value: current.clientId });
    }
    if (prev.clientName !== current.clientName) {
      updates.push({ field: 'clientName', value: current.clientName });
    }
    if (prev.organizationId !== current.organizationId) {
      updates.push({ field: 'organizationId', value: current.organizationId });
    }
    if (prev.organizationName !== current.organizationName) {
      updates.push({ field: 'organizationName', value: current.organizationName });
    }
    if (prev.submittedById !== current.submittedById) {
      updates.push({ field: 'submittedById', value: current.submittedById });
    }
    if (prev.submittedBy !== current.submittedBy) {
      updates.push({ field: 'submittedBy', value: current.submittedBy });
    }
    if (prev.submittedByContact !== current.submittedByContact) {
      updates.push({ field: 'submittedByContact', value: current.submittedByContact });
    }
    if (prev.shippingCharges !== current.shippingCharges) {
      updates.push({ field: 'shippingCharges', value: current.shippingCharges });
    }
    if (prev.discount !== current.discount) {
      updates.push({ field: 'discount', value: current.discount });
    }
    if (prev.vatIncluded !== current.vatIncluded) {
      updates.push({ field: 'vatIncluded', value: current.vatIncluded });
    }
    if (prev.projectLocation !== current.projectLocation) {
      updates.push({ field: 'projectLocation', value: current.projectLocation });
    }
    if (prev.opportunityId !== current.opportunityId) {
      updates.push({ field: 'opportunityId', value: current.opportunityId });
    }
    if (prev.total !== current.total) {
      updates.push({ field: 'total', value: current.total });
    }
    
    return updates;
  }, []);

  // Sync form values to Redux slice with debouncing, batching, and circuit breaker
  // Sections are synced separately via handleSectionsChange -> updateSections
  useEffect(() => {
    // Skip Redux sync during initialization
    if (isLoadingDataRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuotationFormV3] Skipping Redux sync - still initializing');
      }
      return;
    }

    // Use the stable memoized object
    const currentValues = {
      ...watchedValuesObject,
      total: grandTotal,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[QuotationFormV3] Redux sync useEffect triggered');
    }

    // CRITICAL: Check if values have actually changed BEFORE starting debounce timer
    const prev = prevValuesRef.current;
    const updates = collectChangedFields(prev, currentValues);
    
    // If no changes detected, skip entirely (don't even debounce)
    if (updates.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[QuotationFormV3] No changes detected, skipping Redux sync');
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[QuotationFormV3] Changes detected:', updates.map(u => u.field));
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce Redux sync to avoid blocking UI on every keystroke
    debounceTimerRef.current = setTimeout(() => {
      // Circuit breaker: prevent too many updates
      updateCountRef.current += 1;
      
      // Reset counter after 1 second
      if (updateCountResetTimerRef.current) {
        clearTimeout(updateCountResetTimerRef.current);
      }
      updateCountResetTimerRef.current = setTimeout(() => {
        updateCountRef.current = 0;
      }, 1000);
      
      // If too many updates, warn in development and skip
      if (updateCountRef.current > MAX_UPDATES_PER_SECOND) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[QuotationFormV3] Circuit breaker triggered: Too many Redux updates');
        }
        return;
      }

      // Re-check for changes before dispatching (in case they were reverted during debounce)
      const latestPrev = prevValuesRef.current;
      const latestUpdates = collectChangedFields(latestPrev, currentValues);

      // Batch all Redux dispatches in a single transition
        if (latestUpdates.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[QuotationFormV3] Dispatching Redux updates:', latestUpdates.length);
        }
        
        startTransition(() => {
          latestUpdates.forEach(({ field, value }) => {
            dispatch(updateQuotationField({ field: field as any, value }));
          });
        });
        
        // Update ref with current values for next comparison
        prevValuesRef.current = currentValues;
      }
    }, 300); // 300ms debounce delay

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (updateCountResetTimerRef.current) {
        clearTimeout(updateCountResetTimerRef.current);
      }
    };
  }, [watchedValuesObject, grandTotal, dispatch, collectChangedFields]);

  // Cleanup on component unmount - reset submission flags
  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      shouldPreventSubmissionRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync sections with form state
  // Memoize to prevent unnecessary re-renders and use ref to prevent loops
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  
  const handleSectionsChange = useCallback((newSections: any[]) => {
    // Prevent unnecessary updates if sections haven't actually changed
    if (sectionsRef.current === newSections) return;
    
    setSections(newSections);
    // Use comprehensive options to prevent any side effects that might trigger submission
    setValue('sections', newSections, { 
      shouldValidate: false, 
      shouldDirty: false, 
      shouldTouch: false
    });
    // Update Redux slice - this will recalculate totals
    dispatch(updateSections(newSections));
  }, [setValue, dispatch]);

  // Prevent multiple simultaneous submissions
  const isSubmittingRef = useRef(false);
  const shouldPreventSubmissionRef = useRef(false);

  const onFormSubmit = (data: QuotationFormValues) => {
    // Prevent multiple simultaneous submissions
    if (isSubmittingRef.current || shouldPreventSubmissionRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    shouldPreventSubmissionRef.current = true; // Prevent any further submissions

    // Prepare quotation data matching Prisma schema
    const quotation = {
      quotationNumber: data.quotationNumber,
      date: data.date,
      subject: data.subject,
      submittedTo: data.clientName || '', // Use client name instead of separate field
      coverLetter: data.coverLetter || '',
      financialStatement: data.financialStatement || '',
      tos: data.tos || '',
      expiredDate: data.expiredDate,
      clientId: data.clientId,
      clientName: data.clientName,
      clientAddress: data.clientAddress || '',
      clientContact: data.clientContact || '',
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      submittedById: data.submittedById, // Will be set from session in createQuotation
      submittedBy: data.submittedBy,
      submittedByContact: data.submittedByContact || '',
      shippingCharges: data.shippingCharges || 0,
      discount: data.discount || 0,
      vatIncluded: data.vatIncluded || false,
      projectLocation: data.projectLocation || '',
      opportunityId: data.opportunityId || null,
      sections: sections.map((section: any) => ({
        title: section.title || 'Untitled Section',
        note: section.note || '',
        discount: section.discount ?? 0,
        preparedById: data.submittedById,
        total: section.total ?? 0,
        grandTotal: section.grandTotal ?? 0,
        sortOrder: section.sortOrder ?? 0,
        categoryId: section.categoryId || null,
        // ── Proposal fields (preserved) ─────────────────────────────────
        sectionType: section.sectionType || 'PRICING',
        metadata: section.metadata ?? {},
        // Legacy section-specific fields
        subject: section.subject,
        coverLetter: section.coverLetter,
        preparedBy: section.preparedBy,
        validUntil: section.validUntil,
        projectOverview: section.projectOverview,
        financialStatement: section.financialStatement,
        tos: section.tos,
        content: section.content,
        milestones: section.milestones,
        acceptanceText: section.acceptanceText,
        signatoryName: section.signatoryName,
        signatoryDesignation: section.signatoryDesignation,
        signatureDate: section.signatureDate,
        signatureDataUrl: section.signatureDataUrl,
        // ── Pricing arrays (unchanged) ──────────────────────────────────
        groups: (section.groups || []).map((group: any) => ({
          code: group.code || null,
          description: group.description || 'Untitled Group',
          quantity: group.quantity ?? 0,
          number: group.number ?? 0,
          sortOrder: group.sortOrder ?? 0,
          moduleGroupId: group.moduleGroupId || null,
        items: (group.items || []).map((item: any) => ({
          sl: item.sl ?? 0,
          no: item.no != null ? String(item.no) : null,
          code: item.code || null,
          description: item.description || null,
          height: item.height ?? null,
          width: item.width ?? null,
          depth: item.depth ?? null,
          unit: item.unit || null,
          unitPrice: item.unitPrice ?? 0,
          quantity: item.quantity ?? 0,
          discount: item.discount ?? 0,
          amount: item.amount ?? 0,
          itemId: item.itemId || null,
          moduleGroupItemId: item.moduleGroupItemId || null,
        })),
        })),
        items: (section.items || []).map((item: any) => ({
          sl: item.sl ?? 0,
          no: item.no != null ? String(item.no) : null,
          code: item.code || null,
          description: item.description || null,
          height: item.height ?? null,
          width: item.width ?? null,
          depth: item.depth ?? null,
          unit: item.unit || null,
          unitPrice: item.unitPrice ?? 0,
          quantity: item.quantity ?? 0,
          discount: item.discount ?? 0,
          amount: item.amount ?? 0,
          itemId: item.itemId || null,
        })),
        categoryGroups: (section.categoryGroups || []).map((categoryGroup: any) => ({
          categoryId: categoryGroup.categoryId || null,
          sortOrder: categoryGroup.sortOrder ?? 0,
          items: (categoryGroup.items || []).map((item: any) => ({
            sl: item.sl ?? 0,
            no: item.no != null ? String(item.no) : null,
            code: item.code || null,
            description: item.description || null,
            height: item.height ?? null,
            width: item.width ?? null,
            depth: item.depth ?? null,
            unit: item.unit || null,
            unitPrice: item.unitPrice ?? 0,
            quantity: item.quantity ?? 0,
            discount: item.discount ?? 0,
            amount: item.amount ?? 0,
            itemId: item.itemId || null,
          })),
        })),
      })),
    };
    
    // Don't reset flags immediately - let redirect happen
    // Flags will be reset on component unmount
    onSubmit(quotation);
  };

  const handleSaveDraft = () => {
    const data = watch();
    // Prepare quotation data matching Prisma schema
    const quotation = {
      quotationNumber: data.quotationNumber,
      date: data.date,
      subject: data.subject,
      submittedTo: data.clientName || '', // Use client name instead of separate field
      coverLetter: data.coverLetter || '',
      financialStatement: data.financialStatement || '',
      tos: data.tos || '',
      expiredDate: data.expiredDate,
      clientId: data.clientId,
      clientName: data.clientName,
      clientAddress: data.clientAddress || '',
      clientContact: data.clientContact || '',
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      submittedById: data.submittedById, // Will be set from session in createQuotation
      submittedBy: data.submittedBy,
      submittedByContact: data.submittedByContact || '',
      shippingCharges: data.shippingCharges || 0,
      discount: data.discount || 0,
      vatIncluded: data.vatIncluded || false,
      projectLocation: data.projectLocation || '',
      opportunityId: data.opportunityId || null,
      sections: sections.map((section: any) => ({
        title: section.title,
        note: section.note || '',
        discount: section.discount,
        total: section.total,
        grandTotal: section.grandTotal,
        sortOrder: section.sortOrder,
        categoryId: section.categoryId || null,
        // ── Proposal fields (preserved for draft) ───────────────────────
        sectionType: section.sectionType || 'PRICING',
        metadata: section.metadata ?? {},
        subject: section.subject,
        coverLetter: section.coverLetter,
        preparedBy: section.preparedBy,
        validUntil: section.validUntil,
        projectOverview: section.projectOverview,
        financialStatement: section.financialStatement,
        tos: section.tos,
        content: section.content,
        milestones: section.milestones,
        acceptanceText: section.acceptanceText,
        signatoryName: section.signatoryName,
        signatoryDesignation: section.signatoryDesignation,
        signatureDate: section.signatureDate,
        signatureDataUrl: section.signatureDataUrl,
        // ── Pricing arrays (unchanged) ──────────────────────────────────
        groups: (section.groups || []).map((group: any) => ({
          code: group.code || '',
          description: group.description,
          quantity: group.quantity,
          sortOrder: group.sortOrder,
          baseUnit: group.baseUnit || null,
          baseUnitPrice: group.baseUnitPrice || null,
          items: (group.items || []).map((item: any) => ({
            sl: item.sl,
            no: item.no != null ? String(item.no) : null,
            code: item.code || '',
            description: item.description || '',
            height: item.height,
            width: item.width,
            depth: item.depth,
            unit: item.unit || null,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discount: item.discount ?? 0,
            amount: item.amount,
            itemId: item.itemId || null,
          })),
        })),
        items: (section.items || []).map((item: any) => ({
          sl: item.sl,
          no: item.no != null ? String(item.no) : null,
          code: item.code || '',
          description: item.description || '',
          height: item.height,
          width: item.width,
          depth: item.depth,
          unit: item.unit || null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount ?? 0,
          amount: item.amount,
          itemId: item.itemId || null,
        })),
        categoryGroups: (section.categoryGroups || []).map((categoryGroup: any) => ({
          categoryId: categoryGroup.categoryId || null,
          sortOrder: categoryGroup.sortOrder ?? 0,
          items: (categoryGroup.items || []).map((item: any) => ({
            sl: item.sl ?? 0,
            no: item.no != null ? String(item.no) : null,
            code: item.code || null,
            description: item.description || null,
            height: item.height ?? null,
            width: item.width ?? null,
            depth: item.depth ?? null,
            unit: item.unit || null,
            unitPrice: item.unitPrice ?? 0,
            quantity: item.quantity ?? 0,
            discount: item.discount ?? 0,
            amount: item.amount ?? 0,
            itemId: item.itemId || null,
          })),
        })),
      })),
    };
    onSubmit(quotation);
  };

  const onSubmitWithErrorHandling = (data: QuotationFormValues) => {
    try {
      onFormSubmit(data);
    } catch (error) {
      // Error handling - form validation will show errors
    }
  };

  const onError = (errors: any) => {
    // Form validation errors are handled by react-hook-form
    // No need for console logging - errors are displayed in UI
  };

  return (
    <div className="pb-40">
      {/* ── Sticky identity header ──────────────────────────────────────── */}
      <QuotationHeaderBar
        quotationNumber={watchedValuesObject.quotationNumber || ''}
        clientName={watchedValuesObject.clientName || ''}
        organizationName={watchedValuesObject.organizationName || ''}
        date={date || ''}
        status={'DRAFT' as QuotationStatus}
        onStatusChange={useCallback((s: QuotationStatus) => {}, [])}
        mode={'CUSTOM' as QuotationMode}
        onModeChange={useCallback(() => {}, [])}
        onSave={handleSaveDraft}
        isSaving={false}
      />

      {/* ── Document body ────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit((data) => onFormSubmit(data as any), onError)}
        className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8"
      >
        {/* Meta panel — compact single row for basic identifiers */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <QuotationBasicInfoCard
            shippingCharges={watchedValuesObject.shippingCharges}
            discount={watchedValuesObject.discount}
            vatIncluded={watchedValuesObject.vatIncluded}
            expiredDate={watchedValuesObject.expiredDate}
            opportunityId={watchedValuesObject.opportunityId}
            onShippingChargesChange={useCallback((value: number) => {
              setValue('shippingCharges', value);
              dispatch(updateQuotationField({ field: 'shippingCharges', value }));
            }, [setValue, dispatch])}
            onDiscountChange={useCallback((value: number) => {
              setValue('discount', value);
              dispatch(updateQuotationField({ field: 'discount', value }));
            }, [setValue, dispatch])}
            onVatIncludedChange={useCallback((value: boolean) => {
              setValue('vatIncluded', value);
              dispatch(updateQuotationField({ field: 'vatIncluded', value }));
            }, [setValue, dispatch])}
            onExpiredDateChange={useCallback((value: string) => {
              setValue('expiredDate', value);
            }, [setValue])}
            onOpportunityChange={useCallback((value: any) => {
              if (typeof value === 'object' && value !== null) {
                setValue('opportunityId', value.id);
                if (value.client) {
                  setValue('clientId', value.client.id);
                  setValue('clientName', value.client.name || value.client.company || value.client.email);
                }
              } else {
                setValue('opportunityId', value);
              }
            }, [setValue])}
          />
        </div>

        {/* ── Proposal sections — per-type rendering ─────────────────────── */}
        <SectionsList
          sections={sections}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          isSectionComplete={isSectionComplete}
          watchedValuesObject={watchedValuesObject}
          handleSectionsChange={handleSectionsChange}
        />

        {/* ── Add optional section button + modal ────────────────────────── */}
        <AddSectionButton
          sections={sections}
          handleSectionsChange={handleSectionsChange}
        />
      </form>

      {/* ── Fixed bottom totals bar ─────────────────────────────────────── */}
      <StickyTotalsBar
        subtotal={grandTotal + (discount ?? 0)}  // pre-discount sum
        discount={discount ?? 0}
        vatIncluded={vatIncluded ?? false}
        shippingCharges={shippingCharges ?? 0}
        grandTotal={grandTotal + (shippingCharges ?? 0)}
        onSaveDraft={handleSaveDraft}
        onSubmit={() =>
          handleSubmit(
            (data) => onFormSubmit(data as any),
            onError
          )()
        }
      />
    </div>
  );
}


