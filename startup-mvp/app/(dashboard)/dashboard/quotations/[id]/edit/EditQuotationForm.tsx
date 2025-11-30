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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    startTransition(async () => {
      try {
        setError(null);
        const result = await updateQuotation(quotationId, data);
        
        if (!result.success) {
          setError(result.error || 'Failed to update quotation');
          return;
        }
        
        router.push(`/dashboard/quotations/${quotationId}`);
      } catch (err) {
        console.error('Error updating quotation:', err);
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

