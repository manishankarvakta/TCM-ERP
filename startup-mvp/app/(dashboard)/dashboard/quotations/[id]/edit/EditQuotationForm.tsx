'use client';

import { QuotationFormV3 } from '@/components/quotation/QuotationFormV3';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useRef, useCallback } from 'react';
import { updateQuotation } from '@/app/actions/quotations';

interface EditQuotationFormProps {
  quotationId: string;
  initialData: Record<string, unknown>;
}

export default function EditQuotationForm({ quotationId, initialData }: EditQuotationFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debug: Track renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EditQuotationForm /dashboard] Render #${renderCountRef.current}`);
  }

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[EditQuotationForm /dashboard] Blocked duplicate submission attempt');
      }
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    startTransition(async () => {
      try {
        const result = await updateQuotation(quotationId, data);
        
        if (!result.success) {
          setError(result.error || 'Failed to update quotation');
          setIsSubmitting(false);
          return;
        }
        
        // Only redirect if update was successful - prevent infinite loop
        // Use replace instead of push to avoid adding to history
        // Don't call router.refresh() - redirect is sufficient and prevents reload loop
        router.replace(`/dashboard/quotations/${quotationId}`);
        // Don't reset isSubmitting - we're redirecting
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update quotation');
        setIsSubmitting(false);
      }
    });
  }, [quotationId, isSubmitting, router, startTransition]);

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <ErrorBoundary>
        <QuotationFormV3 initialData={initialData} onSubmit={handleSubmit} />
      </ErrorBoundary>
    </>
  );
}

