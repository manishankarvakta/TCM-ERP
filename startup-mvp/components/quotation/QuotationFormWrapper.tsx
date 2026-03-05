'use client';

import { QuotationBuilderV4 } from '@/components/quotation/QuotationBuilderV4';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useRef } from 'react';
import { createQuotation, updateQuotation } from '@/app/actions/quotations';

interface QuotationFormWrapperProps {
  quotationId?: string;
  initialData?: any;
  title?: string;
}

export function QuotationFormWrapper({ quotationId, initialData, title }: QuotationFormWrapperProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting || isSubmittingRef.current) {
      return;
    }
    
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setError(null);
    
    startTransition(async () => {
      try {
        let result;
        if (quotationId) {
          result = await updateQuotation(quotationId, data);
        } else {
          result = await createQuotation(data);
        }
        
        if (!result.success) {
          setError(result.error || `Failed to ${quotationId ? 'update' : 'create'} quotation`);
          setIsSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }
        
        // On success, redirect to the quotation detail page
        const redirectId = quotationId || result.data?.id;
        router.replace(`/dashboard/quotations/${redirectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${quotationId ? 'update' : 'create'} quotation`);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {title && <h1 className="text-4xl font-bold mb-8 xs:text-xl">{title}</h1>}
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <ErrorBoundary>
          <QuotationBuilderV4 initialData={initialData} onSubmit={handleSubmit} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
