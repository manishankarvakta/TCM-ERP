'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { useState, useCallback, useMemo } from 'react';
import { ProjectInfoSection } from './ProjectInfoSection';
import { ClientInformationSection } from './ClientInformationSection';
import { SubmissionInformationSection } from './SubmissionInformationSection';
import { QuotationBasicInfoCard } from './QuotationBasicInfoCard';
import { QuotationItemsArea } from './QuotationItemsArea';
import type { ProjectType, LocationType } from '@/types/enums';

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
  
  // Client info (will be used to create/select client)
  // clientId: z.string().optional(),
  // clientName: z.string().min(1, 'Client name is required'),
  // clientAddress: z.string().optional(),
  // clientContact: z.string().optional(),
  
  // Submitted by (will be current user)
  submittedById: z.string().optional(),
  submittedBy: z.string().optional(), // Will be current user
  submittedByContact: z.string().optional(),
  
  // New fields
  shippingCharges: z.number().optional().default(0),
  vatIncluded: z.boolean().optional().default(false),
  aitIncluded: z.boolean().optional().default(false),
  
  // Project info (optional)
  projectName: z.string().optional(),
  projectLocation: z.string().optional(),
  projectType: z.enum(['INTERIOR', 'CIVIL', 'BOTH']).optional(),
  selectedLocation: z.enum([
    'DHAKA_MYMENSINGH',
    'CHATTOGRAM_SYLHET',
    'KHULNA_BARISAL_GOPALGONJ',
    'RAJSHAHI_RANGPUR',
  ]).optional(),
  
  // Modules with items
  modules: z.array(
    z.object({
      title: z.string().min(1, 'Module title is required'),
      note: z.string().optional(),
      discount: z.number().optional(),
      sortOrder: z.number().default(0),
      items: z.array(
        z.object({
          sl: z.number(),
          code: z.string().optional(),
          description: z.string().optional(),
          height: z.number().optional(),
          width: z.number().optional(),
          depth: z.number().optional(),
          unitPrice: z.number().min(0),
          quantity: z.number().min(0),
          amount: z.number().min(0),
          note: z.string().optional(),
          itemId: z.string().optional(),
        })
      ).default([]),
      groups: z.array(
        z.object({
          code: z.string().optional(),
          description: z.string().min(1),
          quantity: z.number().optional(),
          sortOrder: z.number().default(0),
          items: z.array(
            z.object({
              sl: z.number(),
              code: z.string().optional(),
              description: z.string().optional(),
              height: z.number().optional(),
              width: z.number().optional(),
              depth: z.number().optional(),
              unitPrice: z.number().min(0),
              quantity: z.number().min(0),
              amount: z.number().min(0),
              note: z.string().optional(),
            })
          ).default([]),
        })
      ).default([]),
    })
  ).min(1, 'At least one module is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface QuotationFormV3Props {
  initialData?: any;
  onSubmit: (data: any) => void;
}

export function QuotationFormV3({ initialData, onSubmit }: QuotationFormV3Props) {
  // Ensure all items and groups have IDs for drag and drop

  const ensureIds = (modules: any[]) => {
    return modules.map((module) => ({
      ...module,
      items: (module.items || []).map((item: any, index: number) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${index}-${Math.random()}`,
      })),
      groups: (module.groups || []).map((group: any, groupIndex: number) => ({
        ...group,
        id: group.id || `group-${Date.now()}-${groupIndex}-${Math.random()}`,
        isExpanded: group.isExpanded !== undefined ? group.isExpanded : true,
        items: (group.items || []).map((item: any, itemIndex: number) => ({
          ...item,
          id: item.id || `item-${Date.now()}-${groupIndex}-${itemIndex}-${Math.random()}`,
        })),
      })),
    }));
  };

  const defaultModules = initialData?.modules
    ? ensureIds(initialData.modules)
    : [
        {
          title: 'Module 1',
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
      submittedById: initialData?.submittedById || initialData?.submittedBy?.id || '',
      submittedBy: initialData?.submittedBy?.name || initialData?.submittedBy || '',
      submittedByContact: initialData?.submittedBy?.email || initialData?.submittedByContact || '',
      shippingCharges: initialData?.shippingCharges || 0,
      vatIncluded: initialData?.vatIncluded || false,
      aitIncluded: initialData?.aitIncluded || false,
      projectName: initialData?.projectName || '',
      projectLocation: initialData?.projectLocation || '',
      projectType: (initialData?.projectType as ProjectType) || 'BOTH',
      selectedLocation: initialData?.selectedLocation as LocationType | undefined,
      modules: defaultModules,
    },
  });

  const [modules, setModules] = useState<any[]>(defaultModules);

  // Sync modules with form state
  const handleModulesChange = useCallback((newModules: any[]) => {
    setModules(newModules);
    setValue('modules', newModules);
  }, [setValue]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    let total = 0;
    modules.forEach((module) => {
      let moduleTotal = 0;
      module.items.forEach((item: any) => {
        moduleTotal += item.amount || 0;
      });
      module.groups.forEach((group: any) => {
        group.items.forEach((item: any) => {
          moduleTotal += item.amount || 0;
        });
      });
      if (module.discount) {
        moduleTotal = moduleTotal * (1 - module.discount / 100);
      }
      total += moduleTotal;
    });
    return total;
  }, [modules]);

  const onFormSubmit = (data: QuotationFormValues) => {
  console.log("initialData",data);

    // Prepare quotation data matching Prisma schema
    const quotation = {
      quotationNumber: data.quotationNumber,
      date: data.date,
      subject: data.subject,
      submittedTo: data.submittedTo,
      coverLetter: data.coverLetter || '',
      financialStatement: data.financialStatement || '',
      tos: data.tos || '',
      status: data.status,
      clientId: data.clientId,
      clientName: data.clientName,
      clientAddress: data.clientAddress || '',
      clientContact: data.clientContact || '',
      submittedById: data.submittedById,
      submittedBy: data.submittedBy,
      submittedByContact: data.submittedByContact || '',
      modules: modules.map((module: any) => ({
        title: module.title,
        note: module.note || '',
        discount: module.discount,
        sortOrder: module.sortOrder,
        groups: module.groups.map((group: any) => ({
          code: group.code || '',
          description: group.description,
          quantity: group.quantity,
          sortOrder: group.sortOrder,
          items: group.items.map((item: any) => ({
            sl: item.sl,
            code: item.code || '',
            description: item.description || '',
            height: item.height,
            width: item.width,
            depth: item.depth,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            amount: item.amount,
            note: item.note || '',
            itemId: item.itemId,
          })),
        })),
        items: module.items.map((item: any) => ({
          sl: item.sl,
          code: item.code || '',
          description: item.description || '',
          height: item.height,
          width: item.width,
          depth: item.depth,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          amount: item.amount,
          note: item.note || '',
          itemId: item.itemId,
        })),
      })),
    };
    onSubmit(quotation);
  };

  const handleSaveDraft = () => {
    const data = watch();
    // Prepare quotation data matching Prisma schema
    const quotation = {
      quotationNumber: data.quotationNumber,
      date: data.date,
      subject: data.subject,
      submittedTo: data.submittedTo,
      coverLetter: data.coverLetter || '',
      financialStatement: data.financialStatement || '',
      tos: data.tos || '',
      status: 'DRAFT' as const,
      clientId: data.clientId,
      clientName: data.clientName,
      clientAddress: data.clientAddress || '',
      clientContact: data.clientContact || '',
      submittedById: data.submittedById,
      submittedBy: data.submittedBy,
      submittedByContact: data.submittedByContact || '',
      modules: modules.map((module: any) => ({
        title: module.title,
        note: module.note || '',
        discount: module.discount,
        sortOrder: module.sortOrder,
        groups: module.groups.map((group: any) => ({
          code: group.code || '',
          description: group.description,
          quantity: group.quantity,
          sortOrder: group.sortOrder,
          items: group.items.map((item: any) => ({
            sl: item.sl,
            code: item.code || '',
            description: item.description || '',
            height: item.height,
            width: item.width,
            depth: item.depth,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            amount: item.amount,
            note: item.note || '',
            itemId: item.itemId,
          })),
        })),
        items: module.items.map((item: any) => ({
          sl: item.sl,
          code: item.code || '',
          description: item.description || '',
          height: item.height,
          width: item.width,
          depth: item.depth,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          amount: item.amount,
          note: item.note || '',
          itemId: item.itemId,
        })),
      })),
    };
    onSubmit(quotation);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Information Cards - Top on mobile, Right on desktop */}
        <div className="w-full md:w-1/4 space-y-4 order-1 md:order-2">
          {/* Quotation Basic Info */}
          <QuotationBasicInfoCard
            quotationNumber={watch('quotationNumber')}
            date={watch('date')}
            subject={watch('subject')}
            clientId={watch('clientId')}
            clientName={watch('clientName')}
            coverLetter={watch('coverLetter')}
            shippingCharges={watch('shippingCharges') || 0}
            vatIncluded={watch('vatIncluded') || false}
            aitIncluded={watch('aitIncluded') || false}
            status={watch('status')}
            onQuotationNumberChange={useCallback((value: string) => setValue('quotationNumber', value), [setValue])}
            onDateChange={useCallback((value: string) => setValue('date', value), [setValue])}
            onSubjectChange={useCallback((value: string) => setValue('subject', value), [setValue])}
            onClientChange={useCallback((clientId: string, clientName: string) => {
              setValue('clientId', clientId);
              setValue('clientName', clientName);
            }, [setValue])}
            onCoverLetterChange={useCallback((value: string) => setValue('coverLetter', value), [setValue])}
            onShippingChargesChange={useCallback((value: number) => setValue('shippingCharges', value), [setValue])}
            onVatIncludedChange={useCallback((value: boolean) => setValue('vatIncluded', value), [setValue])}
            onAitIncludedChange={useCallback((value: boolean) => setValue('aitIncluded', value), [setValue])}
            onStatusChange={useCallback((value: string) => setValue('status', value as any), [setValue])}
          />
        </div>

        {/* Items Area - Bottom on mobile, Left on desktop */}
        <div className="w-full md:w-3/4 space-y-2 order-2 md:order-1">
          <QuotationItemsArea modules={modules} onModulesChange={handleModulesChange} />
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
