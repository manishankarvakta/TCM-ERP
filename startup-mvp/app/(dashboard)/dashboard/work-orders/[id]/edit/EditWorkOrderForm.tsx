'use client';

import { WorkOrderForm } from '@/components/work-order/WorkOrderForm';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateWorkOrder } from '@/app/actions/work-orders';
import { useToast } from '@/hooks/use-toast';
import { WorkOrderStatus } from '@prisma/client';

interface EditWorkOrderFormProps {
  workOrderId: string;
  initialData: {
    quotationId: string;
    amount: number;
    advance: number | null;
    status: WorkOrderStatus;
  };
}

export default function EditWorkOrderForm({ workOrderId, initialData }: EditWorkOrderFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    startTransition(async () => {
      try {
        const result = await updateWorkOrder(workOrderId, data);

        if (result.success && result.data) {
          toast({
            title: 'Success',
            description: 'Work order updated successfully',
          });
          router.push(`/dashboard/work-orders/${workOrderId}`);
        } else {
          const errorMessage = result.error || 'Failed to update work order';
          setError(errorMessage);
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
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
      <ErrorBoundary>
        <WorkOrderForm
          initialData={{
            quotationId: initialData.quotationId,
            amount: initialData.amount,
            advance: initialData.advance || undefined,
            status: initialData.status,
          }}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </ErrorBoundary>
    </>
  );
}

