"use client";
import { QuotationBuilderV4 } from '@/components/quotation/QuotationBuilderV4';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useRef, useCallback } from 'react';
import { createQuotation } from '@/app/actions/quotations';

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get('opportunityId');
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Prevent multiple simultaneous submissions
  const isSubmittingRef = useRef(false);
  
  // Debug: Track renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  const prevErrorRef = useRef(error);
  
  if (process.env.NODE_ENV === 'development') {
    const errorChanged = prevErrorRef.current !== error;
    console.log(`[NewQuotationPage /dashboard] Render #${renderCountRef.current}`, {
      errorChanged,
      error
    });
    prevErrorRef.current = error;
  }

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    // Guard against multiple simultaneous submissions
    if (isSubmittingRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[NewQuotationPage /dashboard] Blocked duplicate submission attempt');
      }
      return;
    }
    
    isSubmittingRef.current = true;
    console.log("data", data);
    
    startTransition(async () => {
      try {
        setError(null);
        const result = await createQuotation(data);
        
        if (!result.success) {
          setError(result.error || 'Failed to create quotation');
          isSubmittingRef.current = false; // Reset on error
          return;
        }
        
        router.push(`/dashboard/quotations/${result.data?.id}`);
        // Don't reset flag after successful submission - page will unmount
      } catch (err) {
        console.error('Error creating quotation:', err);
        setError(err instanceof Error ? err.message : 'Failed to create quotation');
        isSubmittingRef.current = false; // Reset on error
      }
    });
  }, [router, startTransition]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 xs:text-xl">Create New Quotation</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <ErrorBoundary>
          <QuotationBuilderV4
            initialData={opportunityId ? { opportunityId } : undefined}
            onSubmit={handleSubmit}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
