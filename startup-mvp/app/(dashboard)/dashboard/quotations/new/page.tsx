"use client";

import { useSearchParams } from 'next/navigation';
import { QuotationFormWrapper } from '@/components/quotation/QuotationFormWrapper';

export default function NewQuotationPage() {
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get('opportunityId');

  return (
    <QuotationFormWrapper
      title="Create New Quotation"
      initialData={opportunityId ? { opportunityId } : undefined}
    />
  );
}
