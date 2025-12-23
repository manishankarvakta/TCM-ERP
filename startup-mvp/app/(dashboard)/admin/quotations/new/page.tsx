'use client';

import { QuotationFormV3 } from '@/components/quotation/QuotationFormV3';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createQuotation } from '@/app/actions/quotations';

export default function NewQuotationPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log("data",data);
    startTransition(async () => {
      try {
        setError(null);
        const result = await createQuotation(data);
        
        if (!result.success) {
          setError(result.error || 'Failed to create quotation');
          return;
        }
        
        router.push(`/admin/quotations/${result.data?.id}`);
      } catch (err) {
        console.error('Error creating quotation:', err);
        setError(err instanceof Error ? err.message : 'Failed to create quotation');
      }
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 xs:text-xl">Create New Quotation</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <QuotationFormV3 onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
