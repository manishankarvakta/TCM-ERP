'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setCurrentQuotation } from '@/lib/redux/slices/quotationSlice';
import { generateQuotationNumber } from '@/lib/utils/formatters';
import { useState } from 'react';
import type { Quotation } from '@/types/quotation';
import { ItemForm } from './ItemForm';

const quotationSchema = z.object({
  quotationNumber: z.string().min(1),
  date: z.string(),
  clientName: z.string().min(1, 'Client name is required'),
  clientAddress: z.string().min(1, 'Client address is required'),
  clientContact: z.string().min(1, 'Client contact is required'),
  submittedBy: z.string().min(1, 'Submitted by is required'),
  submittedByContact: z.string().min(1, 'Contact is required'),
  reference: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  validityDays: z.number().min(1),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationFormProps {
  initialData?: Quotation;
  onSubmit: (data: Partial<Quotation>) => void;
}

export function QuotationForm({ initialData, onSubmit }: QuotationFormProps) {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState(initialData?.items || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      quotationNumber: initialData?.quotationNumber || generateQuotationNumber(),
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      clientName: initialData?.clientName || '',
      clientAddress: initialData?.clientAddress || '',
      clientContact: initialData?.clientContact || '',
      submittedBy: initialData?.submittedBy || '',
      submittedByContact: initialData?.submittedByContact || '',
      reference: initialData?.reference || '',
      subject: initialData?.subject || '',
      validityDays: initialData?.validityDays || 30,
    },
  });

  const onFormSubmit = (data: QuotationFormData) => {
    const quotation: Partial<Quotation> = {
      ...data,
      date: new Date(data.date),
      items: items,
      grandTotal: items.reduce((sum, item) => sum + Number(item.amount), 0),
      paymentTerms: initialData?.paymentTerms || '50% advance, 50% before delivery',
      deliveryTerms: initialData?.deliveryTerms || '45 days from order confirmation',
      warrantyTerms: initialData?.warrantyTerms || '6 months warranty with 4 free inspections',
      status: (initialData?.status || 'DRAFT') as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "REVISED",
    };
    
    dispatch(setCurrentQuotation(quotation as Quotation));
    onSubmit(quotation);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="grid grid-cols-12 gap-6">
        {/* Left Side - Items and Components (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <ItemForm items={items} setItems={setItems} />
        </div>

        {/* Right Side - Form Details (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Quotation Details */}
          <Card className="top-6">
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quotationNumber">Quotation Number</Label>
                <Input
                  id="quotationNumber"
                  {...register('quotationNumber')}
                  readOnly
                  className="bg-gray-50"
                />
                {errors.quotationNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.quotationNumber.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                />
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  placeholder="e.g., Quotation for Master Bedroom Closet"
                />
                {errors.subject && (
                  <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  {...register('clientName')}
                  placeholder="Enter client name"
                />
                {errors.clientName && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="clientAddress">Client Address</Label>
                <Input
                  id="clientAddress"
                  {...register('clientAddress')}
                  placeholder="Enter client address"
                />
                {errors.clientAddress && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientAddress.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="clientContact">Client Contact</Label>
                <Input
                  id="clientContact"
                  {...register('clientContact')}
                  placeholder="Phone/Email"
                />
                {errors.clientContact && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientContact.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submitted By */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted By</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="submittedBy">Name</Label>
                <Input
                  id="submittedBy"
                  {...register('submittedBy')}
                  placeholder="Your name"
                />
                {errors.submittedBy && (
                  <p className="text-sm text-red-500 mt-1">{errors.submittedBy.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="submittedByContact">Contact</Label>
                <Input
                  id="submittedByContact"
                  {...register('submittedByContact')}
                  placeholder="Your contact"
                />
                {errors.submittedByContact && (
                  <p className="text-sm text-red-500 mt-1">{errors.submittedByContact.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  {...register('reference')}
                  placeholder="Optional reference"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button type="button" variant="outline" className="w-full">
              Save Draft
            </Button>
            <Button type="submit" className="w-full">
              Create Quotation
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

