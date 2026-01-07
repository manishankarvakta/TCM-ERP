'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { useState, useCallback, useMemo, useEffect, useRef, startTransition } from 'react';
import { ProjectInfoSection } from './ProjectInfoSection';
import { ClientInformationSection } from './ClientInformationSection';
import { SubmissionInformationSection } from './SubmissionInformationSection';
import { QuotationBasicInfoCard } from './QuotationBasicInfoCard';
import { QuotationItemsArea } from './QuotationItemsArea';
import type { ProjectType, LocationType } from '@/types/enums';
import { getQuotationUser, getTOSContent } from '@/app/actions/quotation-helpers';
import { getActiveOrganizations } from '@/app/actions/organizations';
import { useAppDispatch } from '@/lib/redux/hooks';
import { updateQuotationField, setCurrentQuotation, updateSections } from '@/lib/redux/slices/quotationSlice';

  // Validation schema matching Prisma schema
const quotationSchema = z.object({
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  date: z.string().min(1, 'Date is required'),
  subject: z.string().min(1, 'Subject is required'),
  submittedTo: z.string().optional(), // Will be set to current user
  coverLetter: z.string().optional(),
  financialStatement: z.string().optional(),
  tos: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVISED']).default('DRAFT'),
  
  // Organization info
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  
  // Client info (will be used to create/select client)
  clientId: z.string().optional(),
  // clientName: z.string().optional(),
  // clientAddress: z.string().optional(),
  // clientContact: z.string().optional(),
  
  // Submitted by (will be current user)
  submittedById: z.string().optional(),
  submittedBy: z.string().optional(), // Will be current user
  submittedByContact: z.string().optional(),
  
  // New fields
  shippingCharges: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  vatIncluded: z.boolean().optional().default(false),
  
  // Project info (optional)
  projectLocation: z.string().optional(),
  
  // Sections with items
      sections: z.array(
    z.object({
      title: z.string().min(1, 'Section title is required'),
      note: z.string().optional(),
      discount: z.number().optional(),
      total: z.number().optional(),
      grandTotal: z.number().optional(),
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
          discount: z.number().min(0).optional().default(0),
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
              discount: z.number().min(0).optional().default(0),
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
              discount: z.number().min(0).optional().default(0),
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

export function QuotationFormV3({ initialData, onSubmit }: QuotationFormV3Props) {
  const dispatch = useAppDispatch();
  
  // Debug: Track renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[QuotationFormV3] Render #${renderCountRef.current}`);
  }
  
  // Normalize and ensure all items and groups have IDs for drag and drop
  const ensureIds = (sections: any[]) => {
    return sections.map((section, sectionIndex) => ({
      title: section.title || `Section ${sectionIndex + 1}`,
      note: section.note || '',
      discount: section.discount ?? 0,
      total: section.total ?? 0,
      grandTotal: section.grandTotal ?? 0,
      sortOrder: section.sortOrder ?? sectionIndex,
      categoryId: section.categoryId || null,
      items: (section.items || []).map((item: any, index: number) => ({
        sl: item.sl ?? index + 1,
        no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
          no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
          no: item.no != null ? String(item.no) : null, // Ensure no is always string
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

  // Get sections from initial data (from DB) if available
  const sectionsFromData = initialData?.sections || initialData?.section || [];
  const defaultSections = sectionsFromData.length > 0
    ? ensureIds(sectionsFromData)
    : [
        {
          title: 'Section 1',
          sortOrder: 0,
          items: [],
          groups: [],
        },
      ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuotationFormValues>({
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
      status: initialData?.status || 'DRAFT',
      clientId: initialData?.clientId || initialData?.client?.id || '',
      clientName: initialData?.client?.name || initialData?.clientName || '',
      clientAddress: initialData?.client?.address || initialData?.clientAddress || '',
      clientContact: initialData?.client?.phone || initialData?.clientContact || '',
      organizationId: initialData?.organizationId || initialData?.organization?.id || undefined,
      organizationName: initialData?.organizationName || initialData?.organization?.name || undefined,
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

        // Get TOS from settings
        const tosResult = await getTOSContent();
        if (tosResult.success && tosResult.content) {
          setValue('tos', tosResult.content, { shouldDirty: false, shouldValidate: false });
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
          if (initialData.organizationId) {
            setValue('organizationId', initialData.organizationId, { shouldDirty: false, shouldValidate: false });
            dispatch(updateQuotationField({ field: 'organizationId', value: initialData.organizationId }));
          }
          if (initialData.organizationName) {
            setValue('organizationName', initialData.organizationName, { shouldDirty: false, shouldValidate: false });
            dispatch(updateQuotationField({ field: 'organizationName', value: initialData.organizationName }));
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
  const status = watch('status');
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

  // Memoize watched values object with stable dependencies
  const watchedValuesObject = useMemo(() => ({
    quotationNumber: quotationNumber || '',
    date: date || '',
    subject: subject || '',
    coverLetter: coverLetter || null,
    financialStatement: financialStatement || null,
    tos: tos || null,
    status: (status as any) || 'DRAFT',
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
    statusValue: status,
  }), [
    quotationNumber,
    date,
    subject,
    coverLetter,
    financialStatement,
    tos,
    status,
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
    status?: string;
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
    if (prev.status !== current.status) {
      updates.push({ field: 'status', value: current.status });
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
            dispatch(updateQuotationField({ field, value }));
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
      shouldTouch: false,
      shouldFocus: false 
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
      status: data.status,
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
      sections: sections.map((section: any) => ({
        title: section.title || 'Untitled Section',
        note: section.note || '',
        discount: section.discount ?? 0,
        preparedById: data.submittedById,
        total: section.total ?? 0,
        grandTotal: section.grandTotal ?? 0,
        sortOrder: section.sortOrder ?? 0,
        categoryId: section.categoryId || null,
        groups: (section.groups || []).map((group: any) => ({
          code: group.code || null,
          description: group.description || 'Untitled Group',
          quantity: group.quantity ?? 0,
          number: group.number ?? 0,
          sortOrder: group.sortOrder ?? 0,
          moduleGroupId: group.moduleGroupId || null,
        items: (group.items || []).map((item: any) => ({
          sl: item.sl ?? 0,
          no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
          no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
            no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
      status: 'DRAFT' as const,
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
      sections: sections.map((section: any) => ({
        title: section.title,
        note: section.note || '',
        discount: section.discount,
        total: section.total,
        grandTotal: section.grandTotal,
        sortOrder: section.sortOrder,
        categoryId: section.categoryId || null,
        groups: section.groups.map((group: any) => ({
          code: group.code || '',
          description: group.description,
          quantity: group.quantity,
          sortOrder: group.sortOrder,
          baseUnit: group.baseUnit || null,
          baseUnitPrice: group.baseUnitPrice || null,
          items: group.items.map((item: any) => ({
            sl: item.sl,
            no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
        items: section.items.map((item: any) => ({
          sl: item.sl,
          no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
            no: item.no != null ? String(item.no) : null, // Ensure no is always string
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
    <form onSubmit={handleSubmit(onSubmitWithErrorHandling, onError)} className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Information Cards - Top on mobile, Right on desktop */}
        <div className="w-full md:w-1/4 space-y-4 order-1 md:order-2">
          {/* Quotation Basic Info */}
          <QuotationBasicInfoCard
            quotationNumber={watchedValuesObject.quotationNumber}
            date={watchedValuesObject.date}
            subject={watchedValuesObject.subject}
            organizationId={watchedValuesObject.organizationId}
            organizationName={watchedValuesObject.organizationName}
            clientId={watchedValuesObject.clientId}
            clientName={watchedValuesObject.clientName}
            coverLetter={watchedValuesObject.coverLetter}
            shippingCharges={watchedValuesObject.shippingCharges}
            discount={watchedValuesObject.discount}
            vatIncluded={watchedValuesObject.vatIncluded}
            projectLocation={watchedValuesObject.projectLocation}
            status={watchedValuesObject.statusValue}
            onQuotationNumberChange={useCallback((value: string) => setValue('quotationNumber', value), [setValue])}
            onDateChange={useCallback((value: string) => setValue('date', value), [setValue])}
            onSubjectChange={useCallback((value: string) => setValue('subject', value), [setValue])}
            onOrganizationChange={useCallback((organizationId: string, organizationName: string) => {
              setValue('organizationId', organizationId);
              setValue('organizationName', organizationName);
              // Update Redux slice
              dispatch(updateQuotationField({ field: 'organizationId', value: organizationId }));
              dispatch(updateQuotationField({ field: 'organizationName', value: organizationName }));
            }, [setValue, dispatch])}
            onClientChange={useCallback((clientId: string, clientName: string) => {
              setValue('clientId', clientId, { shouldValidate: true, shouldDirty: true });
              // setValue('clientName', clientName, { shouldValidate: true, shouldDirty: true });
              // Update Redux slice
              dispatch(updateQuotationField({ field: 'clientId', value: clientId }));
              dispatch(updateQuotationField({ field: 'clientName', value: clientName }));
            }, [setValue, dispatch])}
            onCoverLetterChange={useCallback((value: string) => setValue('coverLetter', value), [setValue])}
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
            onProjectLocationChange={useCallback((value: string) => {
              setValue('projectLocation', value);
              dispatch(updateQuotationField({ field: 'projectLocation', value }));
            }, [setValue, dispatch])}
            onStatusChange={useCallback((value: string) => setValue('status', value as any), [setValue])}
          />
        </div>

        {/* Items Area - Bottom on mobile, Left on desktop */}
        <div className="w-full md:w-3/4 space-y-2 order-2 md:order-1">
          <QuotationItemsArea sections={sections} onSectionsChange={handleSectionsChange} />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <Button type="submit">Submit Quotation</Button>
      </div>
    </form>
  );
}
