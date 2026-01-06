'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { useState, useCallback, useMemo, useEffect } from 'react';
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
        no: item.no ?? null,
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
          no: item.no ?? null,
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
          no: item.no ?? null,
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

  // Fetch user, TOS, cover letters, and set first organization on mount (after useForm is initialized)
  useEffect(() => {
    const loadQuotationData = async () => {
      // Get current user
      const userResult = await getQuotationUser();
      if (userResult.success && userResult.user) {
        setValue('submittedById', userResult.user.id);
        setValue('submittedBy', userResult.user.name || '');
        setValue('submittedByContact', userResult.user.email || '');
      }

      // Get TOS from settings
      const tosResult = await getTOSContent();
      if (tosResult.success && tosResult.content) {
        setValue('tos', tosResult.content);
      }

      // Set first organization as default for new quotations
      if (!initialData) {
        const orgResult = await getActiveOrganizations();
        if (orgResult.success && orgResult.organizations && orgResult.organizations.length > 0) {
          const firstOrg = orgResult.organizations[0];
          setValue('organizationId', firstOrg.id);
          setValue('organizationName', firstOrg.name || '');
          // Update Redux slice
          dispatch(updateQuotationField({ field: 'organizationId', value: firstOrg.id }));
          dispatch(updateQuotationField({ field: 'organizationName', value: firstOrg.name || '' }));
        }
      } else {
        // For edit mode, ensure organizationId and organizationName are set if they exist
        if (initialData.organizationId) {
          setValue('organizationId', initialData.organizationId);
          dispatch(updateQuotationField({ field: 'organizationId', value: initialData.organizationId }));
        }
        if (initialData.organizationName) {
          setValue('organizationName', initialData.organizationName);
          dispatch(updateQuotationField({ field: 'organizationName', value: initialData.organizationName }));
        }
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

  // Watch form values for Redux sync
  const watchedValues = watch([
    'quotationNumber',
    'date',
    'subject',
    'coverLetter',
    'financialStatement',
    'tos',
    'status',
    'clientId',
    'clientName',
    'organizationId',
    'organizationName',
    'submittedById',
    'submittedBy',
    'submittedByContact',
    'shippingCharges',
    'discount',
    'vatIncluded',
    'projectLocation',
  ]);

  // Sync form values to Redux slice
  useEffect(() => {
    const [
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
    ] = watchedValues;

    // Initialize or update quotation in Redux
    const quotationData = {
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
      projectLocation: projectLocation || undefined,
      section: sections, // Sections for Redux/DB
      total: grandTotal,
    };
    dispatch(setCurrentQuotation(quotationData));
  }, [watchedValues, sections, grandTotal, dispatch]);

  // Sync sections with form state
  const handleSectionsChange = useCallback((newSections: any[]) => {
    setSections(newSections);
    setValue('sections', newSections);
    // Update Redux slice
    dispatch(updateSections(newSections));
  }, [setValue, dispatch]);

  const onFormSubmit = (data: QuotationFormValues) => {
    console.log('Form submitted with data:', data);
    console.log('Sections state:', sections);

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
            no: item.no ?? null,
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
          no: item.no ?? null,
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
            no: item.no ?? null,
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
    
    console.log('Calling onSubmit with quotation:', quotation);
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
            no: item.no ?? null,
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
          no: item.no ?? null,
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
            no: item.no ?? null,
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
    console.log('Form validation passed, calling onFormSubmit');
    try {
      onFormSubmit(data);
    } catch (error) {
      console.error('Error in onFormSubmit:', error);
    }
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
    console.error('Form validation errors (detailed):', JSON.stringify(errors, null, 2));
    
    // Log specific section errors
    if (errors.sections) {
      console.error('Section validation errors:', errors.sections);
      if (Array.isArray(errors.sections)) {
        errors.sections.forEach((sectionError: any, index: number) => {
          if (sectionError) {
            console.error(`Section ${index} errors:`, sectionError);
            if (sectionError.groups) {
              console.error(`Section ${index} group errors:`, sectionError.groups);
            }
            if (sectionError.items) {
              console.error(`Section ${index} item errors:`, sectionError.items);
            }
          }
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitWithErrorHandling, onError)} className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Information Cards - Top on mobile, Right on desktop */}
        <div className="w-full md:w-1/4 space-y-4 order-1 md:order-2">
          {/* Quotation Basic Info */}
          <QuotationBasicInfoCard
            quotationNumber={watch('quotationNumber')}
            date={watch('date')}
            subject={watch('subject')}
            organizationId={watch('organizationId')}
            organizationName={watch('organizationName')}
            clientId={watch('clientId')}
            clientName={watch('clientName')}
            coverLetter={watch('coverLetter')}
            shippingCharges={watch('shippingCharges') || 0}
            discount={watch('discount') || 0}
            vatIncluded={watch('vatIncluded') || false}
            projectLocation={watch('projectLocation') || ''}
            status={watch('status')}
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
