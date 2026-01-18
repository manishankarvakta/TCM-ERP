'use client';

import { Button } from '@/components/ui/button';
import { FiEdit, FiSend, FiCheck, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateQuotationStatus } from '@/app/actions/quotations';
import { useToast } from '@/hooks/use-toast';
import { QuotationStatus } from '@prisma/client';

interface QuotationActionButtonsProps {
  quotationId: string;
  status: QuotationStatus;
  basePath?: string; // Optional base path, defaults to '/dashboard/quotations'
  canApprove?: boolean; // Whether user has approve permission
}

export default function QuotationActionButtons({ quotationId, status, basePath = '/dashboard/quotations', canApprove = false }: QuotationActionButtonsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    startTransition(async () => {
      const result = await updateQuotationStatus(quotationId, newStatus);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Quotation status updated to ${newStatus}`,
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update quotation status',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Link href={`${basePath}/${quotationId}/edit`}>
        <Button variant="outline">
          <FiEdit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </Link>

      {/* Approve button - visible when status is REVIEW and user has approve permission */}
      {status === 'REVIEW' && canApprove && (
        <Button
          variant="default"
          onClick={() => handleStatusChange(QuotationStatus.REVISED)}
          disabled={isPending}
        >
          <FiCheck className="w-4 h-4 mr-2" />
          Approve
        </Button>
      )}

      {/* Accept button - visible when status is SENT */}
      {status === 'SENT' && (
        <Button
          variant="default"
          onClick={() => handleStatusChange('ACCEPTED')}
          disabled={isPending}
        >
          <FiCheckCircle className="w-4 h-4 mr-2" />
          Accept
        </Button>
      )}

      {/* Send button - visible when status is ACCEPTED, REJECTED, or REVISED */}
      {(status === 'ACCEPTED' || status === 'REJECTED' || status === 'REVISED') && (
        <Button
          variant="default"
          onClick={() => handleStatusChange('SENT')}
          disabled={isPending}
        >
          <FiSend className="w-4 h-4 mr-2" />
          Send
        </Button>
      )}
    </div>
  );
}

