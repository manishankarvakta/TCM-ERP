'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { FiTrash2 } from 'react-icons/fi';
import { deleteQuotation } from '@/app/actions/quotations';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface DeleteQuotationButtonProps {
  quotationId: string;
}

export default function DeleteQuotationButton({ quotationId }: DeleteQuotationButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    
    startTransition(async () => {
      const result = await deleteQuotation(quotationId);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Quotation deleted successfully',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete quotation',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      <FiTrash2 className="w-4 h-4" />
    </Button>
  );
}

