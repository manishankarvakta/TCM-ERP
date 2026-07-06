'use client';

/**
 * QuotationBuilderV4
 *
 * Document-style quotation builder.
 * Drop-in replacement for QuotationFormV3 — accepts identical props.
 *
 * Layout:
 *   ┌── Main (flex-1) ─────────────────────┐  ┌── Sidebar ──┐
 *   │  [DocumentSectionCard COVER]           │  │ QuoteMeta  │
 *   │  [DocumentSectionCard SUMMARY]         │  │ Panel      │
 *   │  [DocumentSectionCard PRICING (items)] │  └────────────┘
 *   │  [DocumentSectionCard ACCEPTANCE]      │
 *   └───────────────────────────────────────┘
 *   ─────────────── QuoteFooterBar (sticky) ──────────────────
 *
 * Rules obeyed:
 *  - QuotationItemsArea internals are NOT touched
 *  - No server action or data model changes
 *  - All calculation logic is unchanged (lifted from V3 as-is)
 *  - All useCallback hooks are defined at the component top level (not inline in JSX)
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { useAppDispatch } from '@/lib/redux/hooks';
import {
  updateQuotationField,
  updateSections,
} from '@/lib/redux/slices/quotationSlice';
import {
  getQuotationUser,
  getTOSContent,
  getQuotationUsers,
} from '@/app/actions/quotation-helpers';
import { getActiveOrganizations } from '@/app/actions/organizations';

// Unchanged existing components
import { QuotationItemsArea } from '@/components/quotation/QuotationItemsArea';

// New builder shell components
import { DocumentSectionCard } from './builder/DocumentSectionCard';
import { QuoteMetaPanel } from './builder/QuoteMetaPanel';
import { QuoteFooterBar } from './builder/QuoteFooterBar';
import { type SectionType } from './builder/SectionTypeIcon';
import { SECTION_REGISTRY } from './sectionRegistry';
import { QuotationHeaderBar, type QuotationMode, type QuotationStatus } from './builder/QuotationHeaderBar';
import { TemplatePicker } from './builder/TemplatePicker';
import { getQuotationSectionsForTemplate } from '@/app/actions/quotations';

// Section content renderers (non-pricing)
import { SectionRenderer } from './SectionRenderer';

// ── Proposal section system ───────────────────────────────────────────────────
import { getDefaultSections, makeBlankSection } from '@/lib/quotation/defaultSections';
import { SectionLibraryModal } from './builder/SectionLibraryModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// ── Zod schema (identical to V3) ──────────────────────────────────────────────
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
  projectLocation: z.string().optional(),
  currency: z.string().default('TK'),
  shippingCharges: z.number().default(0),
  discount: z.number().default(0),
  vatIncluded: z.boolean().default(false),
  sections: z.array(z.any()).min(1, 'At least one section is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface QuotationBuilderV4Props {
  initialData?: any;
  onSubmit: (data: any) => void;
}

// ── Helpers (identical to V3) ─────────────────────────────────────────────────

const ensureIds = (sections: any[]) =>
  sections.map((section, sectionIndex) => ({
    title: section.title || `Section ${sectionIndex + 1}`,
    note: section.note || '',
    discount: section.discount ?? 0,
    total: section.total ?? 0,
    grandTotal: section.grandTotal ?? 0,
    sortOrder: section.sortOrder ?? sectionIndex,
    categoryId: section.categoryId || null,
    sectionType: section.sectionType || 'PRICING',
    isEnabled: section.isEnabled !== false,
    displayOrder: section.displayOrder ?? sectionIndex,
    metadata: section.metadata || null,
    id: section.id || `section-${sectionIndex}-${Date.now()}`,
    items: (section.items || []).map((item: any, index: number) => ({
      sl: item.sl ?? index + 1,
      no: item.no != null ? String(item.no) : null,
      code: item.code || null,
      description: item.description || null,
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
        unit: item.unit || null,
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        discount: item.discount ?? 0,
        amount: item.amount ?? 0,
        itemId: item.itemId || null,
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

/** Build the payload shape expected by the server action (identical to V3). */
const buildSubmitPayload = (data: QuotationFormValues, sections: any[], mode: QuotationMode) => {
  // Extract legacy fields from sections if they exist
  let coverLetter = data.coverLetter || '';
  let tos = data.tos || '';
  let subject = data.subject || '';
  
  const coverSection = sections.find(s => s.sectionType === 'COVER');
  if (coverSection?.metadata) {
    if (coverSection.metadata.coverLetter) coverLetter = coverSection.metadata.coverLetter;
    else if (coverSection.metadata.coverIntro) coverLetter = coverSection.metadata.coverIntro;

    if (coverSection.metadata.subject) subject = coverSection.metadata.subject;
    else if (coverSection.metadata.coverTitle) subject = coverSection.metadata.coverTitle;
  }
  
  const termsSection = sections.find(s => s.sectionType === 'TERMS' || s.sectionType === 'LEGAL_TERMS');
  if (termsSection?.metadata) {
    if (termsSection.metadata.tos) tos = termsSection.metadata.tos;
    else if (termsSection.metadata.content) tos = termsSection.metadata.content;
  }

  return {
  quotationNumber: data.quotationNumber,
  date: data.date,
  subject: subject,
  submittedTo: data.clientName || '',
  coverLetter,
  financialStatement: data.financialStatement || '',
  tos,
  expiredDate: data.expiredDate,
  clientId: data.clientId,
  clientName: data.clientName,
  clientAddress: data.clientAddress || '',
  clientContact: data.clientContact || '',
  organizationId: data.organizationId,
  organizationName: data.organizationName,
  submittedById: data.submittedById,
  submittedBy: data.submittedBy,
  submittedByContact: data.submittedByContact || '',
  shippingCharges: data.shippingCharges || 0,
  discount: data.discount || 0,
  vatIncluded: data.vatIncluded || false,
  currency: data.currency || 'TK',
  projectLocation: data.projectLocation || '',
  opportunityId: data.opportunityId || null,
  mode,
  sections: sections.map((section: any) => ({
    title: section.title || 'Untitled Section',
    note: section.note || '',
    discount: section.discount ?? 0,
    preparedById: data.submittedById,
    total: section.total ?? 0,
    grandTotal: section.grandTotal ?? 0,
    sortOrder: section.sortOrder ?? 0,
    categoryId: section.categoryId || null,
    sectionType: section.sectionType || 'PRICING',
    isEnabled: section.isEnabled !== false,
    displayOrder: section.displayOrder ?? 0,
    metadata: section.metadata || null,
    items: (section.items || []).map((item: any) => ({
      sl: item.sl ?? 0,
      no: item.no != null ? String(item.no) : null,
      code: item.code || null,
      description: item.description || null,
      unit: item.unit || null,
      unitPrice: item.unitPrice ?? 0,
      quantity: item.quantity ?? 0,
      discount: item.discount ?? 0,
      amount: item.amount ?? 0,
      itemId: item.itemId || null,
    })),
    groups: (section.groups || []).map((group: any, groupIndex: number) => ({
      code: group.code || null,
      description: group.description || '',
      quantity: group.quantity ?? 0,
      number: group.number ?? null,
      sortOrder: group.sortOrder ?? groupIndex,
      moduleGroupId: group.moduleGroupId || null,
      baseUnit: group.baseUnit || null,
      baseUnitPrice: group.baseUnitPrice ?? null,
      items: (group.items || []).map((item: any, itemIndex: number) => ({
        sl: item.sl ?? itemIndex + 1,
        no: item.no != null ? String(item.no) : null,
        code: item.code || null,
        description: item.description || null,
        unit: item.unit || null,
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        discount: item.discount ?? 0,
        amount: item.amount ?? 0,
        itemId: item.itemId || null,
      })),
    })),
    categoryGroups: (section.categoryGroups || []).map((catGroup: any, catIndex: number) => ({
      categoryId: catGroup.categoryId || null,
      sortOrder: catGroup.sortOrder ?? catIndex,
      items: (catGroup.items || []).map((item: any, itemIndex: number) => ({
        sl: item.sl ?? itemIndex + 1,
        no: item.no != null ? String(item.no) : null,
        code: item.code || null,
        description: item.description || null,
        unit: item.unit || null,
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        discount: item.discount ?? 0,
        amount: item.amount ?? 0,
        itemId: item.itemId || null,
      })),
    })),
  })),
};};

// ── Add Section button helper ─────────────────────────────────────────────────
function AddSectionButtonV4({
  sections,
  handleSectionsChange,
}: {
  sections: any[];
  handleSectionsChange: (newSections: any[]) => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleAddSection = useCallback(
    (sectionType: string) => {
      const config = SECTION_REGISTRY[sectionType as SectionType];
      const newSection = {
        ...makeBlankSection(sectionType, config?.label || sectionType, 0),
        isEnabled: true,
      };

      const pricingIndex = sections.findIndex((s) => s.sectionType === 'PRICING');
      let newSections = [...sections];

      if (pricingIndex !== -1) {
        // Insert right before PRICING
        newSections.splice(pricingIndex, 0, newSection);
      } else {
        // Fallback: append at end
        newSections.push(newSection);
      }

      // Re-apply display order sequentially
      newSections = newSections.map((s, idx) => ({
        ...s,
        displayOrder: idx + 1,
      }));

      handleSectionsChange(newSections);
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
      <div className="flex justify-center py-3">
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

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotationBuilderV4({ initialData, onSubmit }: QuotationBuilderV4Props) {
  const dispatch = useAppDispatch();

  // ── Mode and status (header-level state) ────────────────────────────────────
  const [mode, setMode] = useState<QuotationMode>(
    (initialData?.mode as QuotationMode) ?? 'STANDARD'
  );
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // When user selects TEMPLATE, open the picker and switch to CUSTOM after load
  const handleModeChange = useCallback(
    async (newMode: QuotationMode) => {
      if (newMode === 'TEMPLATE') {
        setTemplatePickerOpen(true);
        return; // don't set mode yet — wait for template pick
      }
      setMode(newMode);
    },
    []
  );

  const handleTemplatePick = useCallback(
    async (quotationId: string) => {
      setTemplatePickerOpen(false);
      const result = await getQuotationSectionsForTemplate(quotationId);
      if (result.success && result.sections.length > 0) {
        handleSectionsChange(result.sections);
      }
      setMode('CUSTOM'); // after loading template, switch to custom
    },
    // handleSectionsChange defined below — use ref to avoid circular dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [status, setStatus] = useState<QuotationStatus>(
    (initialData?.status as QuotationStatus) ?? 'DRAFT'
  );

  // ── Default sections ────────────────────────────────────────────────────────
  const sectionsFromData = initialData?.sections || initialData?.section || [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultSections = useMemo(
    () =>
      sectionsFromData.length > 0
        ? ensureIds(sectionsFromData)
        : getDefaultSections().map((s, i) => ({ ...s, displayOrder: i + 1, isEnabled: true })),
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Form ────────────────────────────────────────────────────────────────────
  const { handleSubmit, watch, setValue } = useForm({
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
        ? typeof initialData.expiredDate === 'string'
          ? initialData.expiredDate
          : new Date(initialData.expiredDate).toISOString().split('T')[0]
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientId: initialData?.clientId || initialData?.client?.id || '',
      clientName: initialData?.client?.name || initialData?.clientName || '',
      clientAddress: initialData?.client?.address || initialData?.clientAddress || '',
      clientContact: initialData?.client?.phone || initialData?.clientContact || '',
      organizationId: initialData?.organizationId || initialData?.organization?.id || undefined,
      organizationName: initialData?.organizationName || initialData?.organization?.name || '',
      opportunityId: initialData?.opportunityId || '',
      currency: initialData?.currency || 'TK',
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

  // ── Section state ───────────────────────────────────────────────────────────
  const [sections, setSections] = useState<any[]>(defaultSections);
  const [users, setUsers] = useState<any[]>([]);
  const [clientContacts, setClientContacts] = useState<any[]>([]);
  const [opportunityName, setOpportunityName] = useState<string>(
    initialData?.opportunity?.title || ''
  );

  // Sort sections by displayOrder for rendering
  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [sections]
  );

  // ── Grand total ─────────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => {
    let total = 0;
    sections.forEach((section) => {
      let sectionTotal = 0;
      (section.items || []).forEach((item: any) => { sectionTotal += item.amount || 0; });
      if (section.discount) sectionTotal -= section.discount;
      total += Math.max(0, sectionTotal);
    });
    return total;
  }, [sections]);

  // ── Watched values for the sidebar / footer ─────────────────────────────────
  const quotationNumber = watch('quotationNumber') || '';
  const date = watch('date') || '';
  const clientName = watch('clientName') || '';
  const organizationName = watch('organizationName') || '';
  const expiredDate = watch('expiredDate') || '';
  const opportunityId = watch('opportunityId') || '';
  const shippingCharges = watch('shippingCharges') ?? 0;
  const discount = watch('discount') ?? 0;
  const vatIncluded = watch('vatIncluded') ?? false;

  // Primary contact's full name for cover letter templating
  const primaryContact = clientContacts.find((c: any) => c.isPrimary) || clientContacts[0];
  const contactName = primaryContact
    ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim()
    : '';
  const clientCompany = watch('clientName') || ''; // clientName is actually the company name

  useEffect(() => {
    let isMounted = true;

    const loadQuotationData = async () => {
      try {
        const [userResult, usersResult, tosResult] = await Promise.all([
          getQuotationUser(),
          getQuotationUsers(),
          getTOSContent(),
        ]);

        if (!isMounted) return;

        if (usersResult.success) {
          setUsers(usersResult.users);
        }

        if (userResult.success && userResult.user) {
          setValue('submittedById', userResult.user.id, { shouldDirty: false, shouldValidate: false });
          setValue('submittedBy', userResult.user.name || '', { shouldDirty: false, shouldValidate: false });
          setValue('submittedByContact', userResult.user.email || '', { shouldDirty: false, shouldValidate: false });
        }

        if (tosResult.success && tosResult.content) {
          setValue('tos', tosResult.content, { shouldDirty: false, shouldValidate: false });
        }

        if (!initialData) {
          const orgResult = await getActiveOrganizations();
          if (!isMounted) return;
          if (orgResult.success && orgResult.organizations?.length > 0) {
            const firstOrg = orgResult.organizations[0];
            setValue('organizationId', firstOrg.id, { shouldDirty: false, shouldValidate: false });
            setValue('organizationName', firstOrg.name || '', { shouldDirty: false, shouldValidate: false });
            dispatch(updateQuotationField({ field: 'organizationId', value: firstOrg.id }));
            dispatch(updateQuotationField({ field: 'organizationName', value: firstOrg.name || '' }));
          }
        } else {
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
      } catch (e) {
        // Non-fatal: form can still be used without pre-filled data
        console.warn('[QuotationBuilderV4] Failed to load init data:', e);
      }
    };

    loadQuotationData();
    return () => { isMounted = false; };
  }, [initialData, setValue, dispatch]);

  // ── Section change handler ──────────────────────────────────────────────────
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const handleSectionsChange = useCallback(
    (newSections: any[]) => {
      if (sectionsRef.current === newSections) return;
      setSections(newSections);
      setValue('sections', newSections, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      dispatch(updateSections(newSections));
    },
    [setValue, dispatch]
  );

  /** Update a single section by its index in the unsorted `sections` array. */
  const updateSection = useCallback(
    (sectionIndex: number, patch: Partial<any>) => {
      const updated = sectionsRef.current.map((s, i) =>
        i === sectionIndex ? { ...s, ...patch } : s
      );
      handleSectionsChange(updated);
    },
    [handleSectionsChange]
  );

  /** Remove a single section by its index in the unsorted `sections` array. */
  const removeSection = useCallback(
    (sectionIndex: number) => {
      const updated = sectionsRef.current.filter((_, i) => i !== sectionIndex);
      // Re-apply display order sequentially
      const reordered = updated.map((s, idx) => ({
        ...s,
        displayOrder: idx + 1,
      }));
      handleSectionsChange(reordered);
    },
    [handleSectionsChange]
  );

  /** Merge updated pricing sections back into the full sections array. */
  const handlePricingSectionsChange = useCallback(
    (updated: any[]) => {
      let pricingIdx = 0;
      const merged = sectionsRef.current.map((s) => {
        if ((s.sectionType || 'PRICING') === 'PRICING') {
          return updated[pricingIdx++] ?? s;
        }
        return s;
      });
      handleSectionsChange(merged);
    },
    [handleSectionsChange]
  );

  // ── Section-level DnD ───────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const current = sectionsRef.current;
      const oldIndex = current.findIndex((s) => s.id === active.id);
      const newIndex = current.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(current, oldIndex, newIndex).map((s, i) => ({
        ...s,
        displayOrder: i + 1,
      }));
      handleSectionsChange(reordered);
    },
    [handleSectionsChange]
  );

  // ── Submission ──────────────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false);

  const buildAndSubmit = useCallback(
    (data: QuotationFormValues) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      onSubmit(buildSubmitPayload(data, sectionsRef.current, mode));
    },
    [onSubmit, mode]
  );

  const handleSaveDraft = useCallback(() => {
    const data = watch() as QuotationFormValues;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    onSubmit(buildSubmitPayload(data, sectionsRef.current, mode));
  }, [watch, onSubmit, mode]);

  const handleFooterSubmit = useCallback(() => {
    const data = watch() as QuotationFormValues;
    buildAndSubmit(data);
  }, [watch, buildAndSubmit]);

  useEffect(() => {
    return () => { isSubmittingRef.current = false; };
  }, []);

  // ── Sidebar callbacks ───────────────────────────────────────────────────────
  const onOpportunityChange = useCallback(
    (v: any) => {
      if (typeof v === 'object' && v !== null) {
        setValue('opportunityId', v.id);
        if (v.title) setOpportunityName(v.title);
        if (v.client) {
          setValue('clientId', v.client.id);
          setValue('clientName', v.client.name || v.client.company || v.client.email);
          setClientContacts(Array.isArray(v.client.Contact) ? v.client.Contact : []);
          
          // Auto-fill Client Information section
          const currentSections = sectionsRef.current;
          const clientInfoSectionIndex = currentSections.findIndex(s => s.sectionType === 'CLIENT_INFO');
          
          if (clientInfoSectionIndex >= 0) {
            const clientInfoSection = currentSections[clientInfoSectionIndex];
            
            // Try to find the primary contact
            const primaryContact = Array.isArray(v.client.Contact) 
              ? v.client.Contact.find((c: any) => c.isPrimary) || v.client.Contact[0]
              : null;
            
            const updatedClientInfo = {
              ...(clientInfoSection.metadata?.clientInfo || {}),
              companyName: v.client.company || v.client.name || '',
              contactPerson: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim() : (v.client.name || ''),
              email: primaryContact?.email || v.client.email || '',
              phone: primaryContact?.phone || v.client.phone || '',
              address: [v.client.address, v.client.city, v.client.state, v.client.zip, v.client.country]
                .filter(Boolean).join(', ') || '',
            };

            const updatedSection = {
              ...clientInfoSection,
              metadata: {
                ...clientInfoSection.metadata,
                clientInfo: updatedClientInfo
              }
            };
            
            updateSection(clientInfoSectionIndex, updatedSection);
          }
        }
      } else {
        setValue('opportunityId', v);
      }
    },
    [setValue, updateSection]
  );
  const onShippingChargesChange = useCallback(
    (v: number) => {
      setValue('shippingCharges', v);
      dispatch(updateQuotationField({ field: 'shippingCharges', value: v }));
    },
    [setValue, dispatch]
  );
  const onDiscountChange = useCallback(
    (v: number) => {
      setValue('discount', v);
      dispatch(updateQuotationField({ field: 'discount', value: v }));
    },
    [setValue, dispatch]
  );

  const onCurrencyChange = useCallback((value: string) => {
    setValue('currency', value);
    dispatch(updateQuotationField({ field: 'currency', value }));
  }, [dispatch, setValue]);

  const onVatIncludedChange = useCallback(
    (v: boolean) => {
      setValue('vatIncluded', v);
      dispatch(updateQuotationField({ field: 'vatIncluded', value: v }));
    },
    [setValue, dispatch]
  );
  const onExpiredDateChange = useCallback(
    (v: string) => setValue('expiredDate', v),
    [setValue]
  );
  const onSubmittedByChange = useCallback(
    (v: string) => {
      setValue('submittedById', v);
      const user = users.find((u) => u.id === v);
      if (user) {
        setValue('submittedBy', user.name || '');
        setValue('submittedByContact', user.email || '');
      }
    },
    [setValue, users]
  );

  // ── Separate PRICING sections for QuotationItemsArea ───────────────────────
  const pricingSections = useMemo(
    () => orderedSections.filter((s) => (s.sectionType || 'PRICING') === 'PRICING'),
    [orderedSections]
  );

  // ── Track Active Section (Scroll tracking) ──────────────────────────────
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        // Find which section is closest to the top offset (e.g. 150px from top)
        const offset = 150; 
        
        let currentActiveId: string | null = null;
        let minDistance = Infinity;

        orderedSections.forEach((section) => {
          const el = document.getElementById(section.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            
            // For a sticky header of ~60px, we check when the section passes ~150px from top
            if (rect.top <= offset && rect.bottom > offset) {
              currentActiveId = section.id;
              minDistance = 0;
            } else {
              const distance = Math.abs(rect.top - offset);
              if (distance < minDistance && minDistance !== 0) {
                minDistance = distance;
                currentActiveId = section.id;
              }
            }
          }
        });

        if (currentActiveId && currentActiveId !== activeSectionId) {
          setActiveSectionId(currentActiveId);
        }
      }, 50); // throttle slightly
    };

    // Attach to window
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also try to attach to the likely dashboard scroll container if it exists
    const dashboardMain = document.querySelector('main');
    if (dashboardMain) {
       dashboardMain.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Trigger once on mount to set initial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (dashboardMain) {
        dashboardMain.removeEventListener('scroll', handleScroll);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [orderedSections, activeSectionId]);
  
  const handleSectionClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── Sticky identity header ─────────────────────────────────────────── */}
      <QuotationHeaderBar
        quotationNumber={quotationNumber}
        clientName={clientName}
        organizationName={organizationName}
        date={date}
        status={status}
        onStatusChange={setStatus}
        mode={mode}
        onModeChange={handleModeChange}
        onSave={handleSaveDraft}
        isSaving={isSubmittingRef.current}
      />

      {/* Template picker modal */}
      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleTemplatePick}
      />

      <form
        onSubmit={handleSubmit((data) => buildAndSubmit(data as any))}
        className="flex flex-col gap-4 md:flex-row md:items-stretch relative"
      >
        {/* ── Main document area ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* In STANDARD mode, DnD is disabled */}
          <DndContext
            sensors={mode === 'STANDARD' ? [] : sensors}
            collisionDetection={closestCenter}
            onDragEnd={mode === 'STANDARD' ? undefined : handleDragEnd}
          >
            <SortableContext
              items={orderedSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedSections.map((section, displayIdx) => {
                const sectionType: SectionType =
                  (section.sectionType as SectionType) || 'PRICING';

                // Find the true index in the unsorted sections array for updates
                const rawIndex = sections.findIndex((s) => s.id === section.id);

                // A section is considered "custom" (and thus removable) if its type is not present in the preset default structure
                const CORE_SECTION_TYPES = ['COVER', 'CLIENT_INFO', 'PROJECT_SUMMARY', 'SCOPE', 'PRICING', 'LEGAL_TERMS', 'ACCEPTANCE'];
                const isCoreSection = CORE_SECTION_TYPES.includes(sectionType as string);

                return (
                  <DocumentSectionCard
                    key={section.id}
                    id={section.id}
                    sectionType={sectionType}
                    title={section.title || ''}
                    isEnabled={section.isEnabled !== false}
                    defaultCollapsed={false}
                    onTitleChange={(title) => updateSection(rawIndex, { title })}
                    onToggleEnabled={(isEnabled) => updateSection(rawIndex, { isEnabled })}
                    onRemove={!isCoreSection ? () => removeSection(rawIndex) : undefined}
                  >
                    {/* PRICING → delegate entirely to QuotationItemsArea (unchanged) */}
                    {sectionType === 'PRICING' ? (
                      <QuotationItemsArea
                        sections={pricingSections}
                        onSectionsChange={handlePricingSectionsChange}
                      />
                    ) : (
                      /* All other types → SectionRenderer */
                      <SectionRenderer
                        section={{ ...section, sectionType }}
                        clientContacts={clientContacts}
                        context={{
                          clientName: contactName || clientName,
                          contactName: contactName || clientName,
                          clientCompany,
                          projectName: opportunityName || watch('subject'),
                          yourCompany: organizationName,
                          yourName: watch('submittedBy'),
                          date,
                          validUntil: expiredDate,
                        }}
                        onChange={(updated) => {
                          if (!Array.isArray(updated)) {
                            updateSection(rawIndex, updated as any);
                          }
                        }}
                      />
                    )}
                  </DocumentSectionCard>
                );
              })}
            </SortableContext>
          </DndContext>

          {/* Add Section button — hidden in STANDARD mode */}
          {mode !== 'STANDARD' && (
            <AddSectionButtonV4
              sections={sections}
              handleSectionsChange={handleSectionsChange}
            />
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <QuoteMetaPanel
          shippingCharges={watch('shippingCharges')}
          discount={watch('discount')}
          vatIncluded={watch('vatIncluded')}
          expiredDate={watch('expiredDate')}
          opportunityId={watch('opportunityId')}
          submittedById={watch('submittedById')}
          currency={watch('currency')}
          users={users}
          onShippingChargesChange={onShippingChargesChange}
          onDiscountChange={onDiscountChange}
          onVatIncludedChange={onVatIncludedChange}
          onExpiredDateChange={onExpiredDateChange}
          onOpportunityChange={onOpportunityChange}
          onSubmittedByChange={onSubmittedByChange}
          onCurrencyChange={onCurrencyChange}
        />
      </form>

      {/* ── Sticky footer — outside the <form> so it spans full width ─────── */}
      <QuoteFooterBar
        grandTotal={grandTotal}
        discount={discount}
        shippingCharges={shippingCharges}
        vatIncluded={vatIncluded}
        sections={orderedSections as any[]}
        activeSectionId={activeSectionId}
        onSectionClick={handleSectionClick}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleFooterSubmit}
      />
    </div>
  );
}
