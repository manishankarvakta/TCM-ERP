'use client';

import { QuotationFormV3 } from '@/components/quotation/QuotationFormV3';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateQuotation } from '@/app/actions/quotations';

interface EditQuotationFormProps {
  quotationId: string;
  initialData: Record<string, unknown>;
}

export default function EditQuotationForm({ quotationId, initialData }: EditQuotationFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    console.log('EditQuotationForm: handleSubmit called');
    console.log('EditQuotationForm: quotationId:', quotationId);
    console.log('EditQuotationForm: data keys:', Object.keys(data || {}));
    console.log('EditQuotationForm: sections count:', (data?.sections as any[])?.length || 0);
    
    startTransition(async () => {
      try {
        console.log('EditQuotationForm: Calling updateQuotation...');
        const result = await updateQuotation(quotationId, data);
        console.log('EditQuotationForm: updateQuotation result:', result);
        
        if (!result.success) {
          console.error('EditQuotationForm: Update failed:', result.error);
          setError(result.error || 'Failed to update quotation');
          return;
        }
        
        console.log('EditQuotationForm: Update successful, redirecting...');
        router.push(`/dashboard/quotations/${quotationId}`);
        router.refresh();
      } catch (err) {
        console.error('EditQuotationForm: Error updating quotation:', err);
        setError(err instanceof Error ? err.message : 'Failed to update quotation');
      }
    });
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <QuotationFormV3 initialData={initialData} onSubmit={handleSubmit} />
    </>
  );
}

