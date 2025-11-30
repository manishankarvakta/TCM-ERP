'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProjectInfoSection } from './ProjectInfoSection';
import { SectionForm } from './SectionForm';
import { formatCurrency, generateQuotationNumber } from '@/lib/utils/formatters';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuotationFormData, LocationType, ProjectType, SectionFormData } from '@/types/quotation';
import { getPWDRateForLocation } from '@/types/constants/locations';

// Validation schema
const quotationSchema = z.object({
  quotationNumber: z.string().min(1),
  date: z.string(),
  clientName: z.string().min(1, 'Client name is required'),
  clientAddress: z.string().min(1, 'Client address is required'),
  clientContact: z.string().min(1, 'Client contact is required'),
  projectName: z.string().optional(),
  projectLocation: z.string().optional(),
  projectType: z.enum(['INTERIOR', 'CIVIL', 'BOTH']),
  selectedLocation: z.enum([
    'DHAKA_MYMENSINGH',
    'CHATTOGRAM_SYLHET',
    'KHULNA_BARISAL_GOPALGONJ',
    'RAJSHAHI_RANGPUR',
  ]).optional(),
  submittedBy: z.string().min(1, 'Submitted by is required'),
  submittedByContact: z.string().min(1, 'Contact is required'),
  reference: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  hotline: z.string().optional(),
  email: z.string().optional(),
  phases: z.array(
    z.object({
      phaseNumber: z.number(),
      phaseName: z.string().min(1, 'Phase name is required'),
      description: z.string().optional(),
      estimatedDuration: z.number().optional(),
      startDate: z.string().optional(),
      sections: z.array(
        z.object({
          slNo: z.number(),
          sectionName: z.string().min(1, 'Section name is required'),
          sectionType: z.enum(['INTERIOR', 'CIVIL', 'GENERAL']),
          description: z.string().optional(),
          pwdItems: z.array(
            z.object({
              pwdScheduleId: z.string().optional(),
              itemNumber: z.string(),
              description: z.string(),
              specifications: z.string().optional(),
              unit: z.string(),
              rateDhakaMym: z.number().optional(),
              rateChatSyl: z.number().optional(),
              rateKhulBariGop: z.number().optional(),
              rateRajRange: z.number().optional(),
              selectedRate: z.number().optional(),
              quantity: z.number().min(0),
              amount: z.number().optional(),
            })
          ),
          interiorUnits: z.array(z.any()),
          materials: z.array(z.any()),
        })
      ),
    })
  ).min(1, 'At least one phase is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface QuotationFormV2Props {
  initialData?: Partial<QuotationFormData>;
  onSubmit: (data: Partial<QuotationFormData>) => void;
}

export function QuotationFormV2({ initialData, onSubmit }: QuotationFormV2Props) {
  const {
    register,
    handleSubmit,
    control,
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
      clientName: initialData?.clientName || '',
      clientAddress: initialData?.clientAddress || '',
      clientContact: initialData?.clientContact || '',
      projectName: initialData?.projectName || '',
      projectLocation: initialData?.projectLocation || '',
      projectType: initialData?.projectType || 'BOTH',
      selectedLocation: initialData?.selectedLocation || undefined,
      submittedBy: initialData?.submittedBy || '',
      submittedByContact: initialData?.submittedByContact || '',
      reference: initialData?.reference || '',
      subject: initialData?.subject || '',
      hotline: initialData?.hotline || '',
      email: initialData?.email || '',
      phases: initialData?.phases?.map((p) => ({
        ...p,
        startDate: p.startDate
          ? typeof p.startDate === 'string'
            ? p.startDate
            : new Date(p.startDate).toISOString().split('T')[0]
          : undefined,
      })) || [
        {
          phaseNumber: 1,
          phaseName: '',
          description: '',
          sections: [],
        },
      ],
    },
  });

  const selectedLocation = watch('selectedLocation');
  const projectType = watch('projectType');
  const allPhases = watch('phases') || [];
  const phases = allPhases;

  // Calculate totals using useMemo to prevent infinite loops
  const grandTotal = useMemo(() => {
    let total = 0;

    allPhases.forEach((phase) => {
      let phaseTotal = 0;

      (phase.sections || []).forEach((section) => {
        let sectionTotal = 0;

        // Sum PWD items
        (section.pwdItems || []).forEach((item) => {
          const amount = (item.amount || (item.selectedRate || 0) * (item.quantity || 0));
          sectionTotal += amount;
        });

        // Sum interior units
        (section.interiorUnits || []).forEach((unit) => {
          const amount = (unit.amount || (unit.unitPrice || 0) * (unit.quantity || 0));
          sectionTotal += amount;
        });

        // Sum materials
        (section.materials || []).forEach((material) => {
          const amount = (material.amount || (material.unitPrice || 0) * (material.quantity || 0));
          sectionTotal += amount;
        });

        phaseTotal += sectionTotal;
      });

      total += phaseTotal;
    });

    return total;
  }, [allPhases]);

  // Update PWD rates when location changes
  useEffect(() => {
    if (!selectedLocation) return;
    
    allPhases.forEach((phase, phaseIndex) => {
      (phase.sections || []).forEach((section, sectionIndex) => {
        (section.pwdItems || []).forEach((item, itemIndex) => {
          const schedule = {
            rateDhakaMym: item.rateDhakaMym ?? null,
            rateChatSyl: item.rateChatSyl ?? null,
            rateKhulBariGop: item.rateKhulBariGop ?? null,
            rateRajRange: item.rateRajRange ?? null,
          };
          const newRate = getPWDRateForLocation(schedule, selectedLocation);
          
          // Only update if rate actually changed
          if (item.selectedRate !== newRate) {
            setValue(
              `phases.${phaseIndex}.sections.${sectionIndex}.pwdItems.${itemIndex}.selectedRate` as any,
              newRate,
              { shouldDirty: false }
            );
          }
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  const onFormSubmit = (data: QuotationFormValues) => {
    const quotation: Partial<QuotationFormData> = {
      ...data,
      date: new Date(data.date),
    };
    onSubmit(quotation);
  };

  const addPhase = () => {
    const nextPhaseNumber = phases.length + 1;
    const currentPhases = watch('phases') || [];
    setValue('phases', [
      ...currentPhases,
      {
        phaseNumber: nextPhaseNumber,
        phaseName: `Phase ${nextPhaseNumber}`,
        description: '',
        sections: [],
      },
    ]);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Project Information */}
      <ProjectInfoSection
        projectName={watch('projectName') || ''}
        projectLocation={watch('projectLocation') || ''}
        projectType={watch('projectType') as ProjectType}
        selectedLocation={watch('selectedLocation') as LocationType | undefined}
        onProjectNameChange={useCallback((value) => setValue('projectName', value), [setValue])}
        onProjectLocationChange={useCallback((value) => setValue('projectLocation', value), [setValue])}
        onProjectTypeChange={useCallback((value) => setValue('projectType', value as ProjectType), [setValue])}
        onLocationChange={useCallback((value) => setValue('selectedLocation', value), [setValue])}
      />

      {/* Client and Submission sections would go here */}
      {/* For now, focusing on the multi-phase structure */}

      {/* Multi-Phase Structure */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Project Phases</CardTitle>
            <Button type="button" onClick={addPhase} size="sm">
              <FiPlus className="w-4 h-4 mr-2" />
              Add Phase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-4">
            {phases.map((phase: any, phaseIndex: number) => {
              const phaseData = phase;
              // Calculate phase total - memoized at component level
              const calculatePhaseTotal = (phase: any) => {
                return (phase?.sections || []).reduce((sum: number, section: any) => {
                  const pwdTotal = (section.pwdItems || []).reduce((s: number, item: any) => {
                    return s + (item.amount || (item.selectedRate || 0) * (item.quantity || 0));
                  }, 0);
                  const unitsTotal = (section.interiorUnits || []).reduce((s: number, unit: any) => {
                    return s + (unit.amount || (unit.unitPrice || 0) * (unit.quantity || 0));
                  }, 0);
                  const materialsTotal = (section.materials || []).reduce((s: number, material: any) => {
                    return s + (material.amount || (material.unitPrice || 0) * (material.quantity || 0));
                  }, 0);
                  return sum + pwdTotal + unitsTotal + materialsTotal;
                }, 0);
              };
              const phaseTotal = calculatePhaseTotal(phaseData);

              return (
                <AccordionItem
                  key={phaseIndex}
                  value={`phase-${phaseIndex}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          Phase {phaseData?.phaseNumber}: {phaseData?.phaseName || 'Untitled Phase'}
                        </span>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        {formatCurrency(phaseTotal)}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Phase Name</Label>
                          <Input
                            {...register(`phases.${phaseIndex}.phaseName`)}
                            placeholder="e.g., Phase 1: Site Setup"
                          />
                        </div>
                        <div>
                          <Label>Duration (days)</Label>
                          <Input
                            type="number"
                            {...register(`phases.${phaseIndex}.estimatedDuration`, { valueAsNumber: true })}
                            placeholder="45"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <textarea
                          {...register(`phases.${phaseIndex}.description`)}
                          className="w-full mt-1 px-3 py-2 border rounded-md min-h-[60px]"
                          placeholder="Phase description..."
                        />
                      </div>

                      {/* Sections */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-base font-semibold">Sections</Label>
                          <Button
                            type="button"
                            onClick={() => {
                              const currentSections = phaseData?.sections || [];
                              const newSection: SectionFormData = {
                                slNo: currentSections.length + 1,
                                sectionName: '',
                                sectionType: 'GENERAL',
                                pwdItems: [],
                                interiorUnits: [],
                                materials: [],
                              };
                              setValue(
                                `phases.${phaseIndex}.sections` as any,
                                [...currentSections, newSection]
                              );
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <FiPlus className="w-4 h-4 mr-2" />
                            Add Section
                          </Button>
                        </div>

                        {phaseData?.sections?.map((section: any, sectionIndex: number) => (
                          <SectionForm
                            key={sectionIndex}
                            section={section}
                            sectionIndex={sectionIndex}
                            selectedLocation={selectedLocation}
                            onUpdate={(updatedSection) => {
                              const updatedSections = [...(phaseData.sections || [])];
                              updatedSections[sectionIndex] = updatedSection;
                              setValue(`phases.${phaseIndex}.sections` as any, updatedSections);
                            }}
                            onRemove={() => {
                              const updatedSections = (phaseData.sections || []).filter((_: any, i: number) => i !== sectionIndex);
                              updatedSections.forEach((s: any, i: number) => {
                                s.slNo = i + 1;
                              });
                              setValue(`phases.${phaseIndex}.sections` as any, updatedSections);
                            }}
                          />
                        ))}

                        {(!phaseData?.sections || phaseData.sections.length === 0) && (
                          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                            No sections added. Click "Add Section" to get started.
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                          <Label className="text-sm text-muted-foreground">Phase Total</Label>
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(phaseTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">Grand Total</h3>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Save Draft
        </Button>
        <Button type="submit">Submit Quotation</Button>
      </div>
    </form>
  );
}

